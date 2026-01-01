import express from 'express'
import { db } from '../database/init.js'
import { promisify } from 'util'
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js'
import { CustomError } from '../middleware/errorHandler.js'
import fs from 'fs'
import path from 'path'

const router = express.Router()
const dbGet = promisify(db.get.bind(db)) as (sql: string, params?: any[]) => Promise<any>
const dbRun = promisify(db.run.bind(db)) as (sql: string, params?: any[]) => Promise<any>
const dbAll = promisify(db.all.bind(db)) as (sql: string, params?: any[]) => Promise<any[]>

// All admin routes require authentication and admin role
router.use(authenticate, requireAdmin)

// Delete album (removes album and all associated songs/tracks)
router.delete('/albums/:id', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params

    // Get album to find file paths
    const album = await dbGet('SELECT * FROM albums WHERE id = ?', [id])
    if (!album) {
      throw new CustomError('Album not found', 404)
    }

    // Get all songs in this album to delete their tracks
    const songs = await dbAll('SELECT id FROM songs WHERE album_id = ?', [id])

    // Delete track files
    for (const song of songs) {
      const tracks = await dbAll('SELECT file_path FROM tracks WHERE song_id = ?', [song.id])
      for (const track of tracks) {
        const filePath = path.join(process.env.UPLOAD_DIR || './uploads', track.file_path)
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
          }
        } catch (error) {
          console.error(`Error deleting track file ${filePath}:`, error)
        }
      }
    }

    // Delete album cover image if exists
    if (album.cover_image) {
      const coverPath = path.join(process.env.UPLOAD_DIR || './uploads', album.cover_image)
      try {
        if (fs.existsSync(coverPath)) {
          fs.unlinkSync(coverPath)
        }
      } catch (error) {
        console.error(`Error deleting cover image ${coverPath}:`, error)
      }
    }

    // Delete album (cascade will handle songs and tracks)
    await dbRun('DELETE FROM albums WHERE id = ?', [id])

    res.json({ message: 'Album deleted successfully' })
  } catch (error) {
    next(error)
  }
})

// Delete song (removes song and all associated tracks)
router.delete('/songs/:id', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params

    // Get song to find file paths
    const song = await dbGet('SELECT * FROM songs WHERE id = ?', [id])
    if (!song) {
      throw new CustomError('Song not found', 404)
    }

    // Delete track files
    const tracks = await dbAll('SELECT file_path FROM tracks WHERE song_id = ?', [id])
    for (const track of tracks) {
      const filePath = path.join(process.env.UPLOAD_DIR || './uploads', track.file_path)
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }
      } catch (error) {
        console.error(`Error deleting track file ${filePath}:`, error)
      }
    }

    // Delete song cover image if exists
    if (song.cover_image) {
      const coverPath = path.join(process.env.UPLOAD_DIR || './uploads', song.cover_image)
      try {
        if (fs.existsSync(coverPath)) {
          fs.unlinkSync(coverPath)
        }
      } catch (error) {
        console.error(`Error deleting cover image ${coverPath}:`, error)
      }
    }

    // Delete song (cascade will handle tracks)
    await dbRun('DELETE FROM songs WHERE id = ?', [id])

    res.json({ message: 'Song deleted successfully' })
  } catch (error) {
    next(error)
  }
})

// Ban user
router.post('/users/:id/ban', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params
    const { reason } = req.body

    const user = await dbGet('SELECT * FROM users WHERE id = ?', [id])
    if (!user) {
      throw new CustomError('User not found', 404)
    }

    if (user.banned) {
      throw new CustomError('User is already banned', 400)
    }

    await dbRun(
      `UPDATE users 
       SET banned = 1, 
           banned_reason = ?,
           banned_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [reason || 'Violation of terms of service', id]
    )

    const updated = await dbGet('SELECT id, email, name, banned, banned_reason, banned_at FROM users WHERE id = ?', [id])
    res.json({ message: 'User banned successfully', user: updated })
  } catch (error) {
    next(error)
  }
})

// Unban user
router.post('/users/:id/unban', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params

    const user = await dbGet('SELECT * FROM users WHERE id = ?', [id])
    if (!user) {
      throw new CustomError('User not found', 404)
    }

    if (!user.banned) {
      throw new CustomError('User is not banned', 400)
    }

    await dbRun(
      `UPDATE users 
       SET banned = 0, 
           banned_reason = NULL,
           banned_at = NULL
       WHERE id = ?`,
      [id]
    )

    const updated = await dbGet('SELECT id, email, name, banned FROM users WHERE id = ?', [id])
    res.json({ message: 'User unbanned successfully', user: updated })
  } catch (error) {
    next(error)
  }
})

// Get all banned users
router.get('/users/banned', async (req: AuthRequest, res, next) => {
  try {
    const bannedUsers = await dbAll(
      'SELECT id, email, name, banned_reason, banned_at FROM users WHERE banned = 1'
    )
    res.json(bannedUsers)
  } catch (error) {
    next(error)
  }
})

// Get all users (for admin)
router.get('/users', async (req: AuthRequest, res, next) => {
  try {
    const users = await dbAll(
      'SELECT id, email, name, banned, banned_reason, banned_at, created_at FROM users ORDER BY created_at DESC'
    )
    res.json(users)
  } catch (error) {
    next(error)
  }
})

export default router

