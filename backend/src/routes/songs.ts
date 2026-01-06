import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { parseFile } from 'music-metadata'
import { db } from '../database/init'
import { v4 as uuidv4 } from 'uuid'
import { promisify } from 'util'
import { authenticate, optionalAuth, getUserId, AuthRequest } from '../middleware/auth.js'
import { requirePremium } from '../middleware/premium.js'
import { CustomError } from '../middleware/errorHandler'

const router = express.Router()
const dbRun = promisify(db.run.bind(db)) as (sql: string, params?: any[]) => Promise<any>
const dbGet = promisify(db.get.bind(db)) as (sql: string, params?: any[]) => Promise<any>
const dbAll = promisify(db.all.bind(db)) as (sql: string, params?: any[]) => Promise<any[]>

// Configure multer for file uploads
const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`)
  }
})

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') // 10MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /audio\/(mp3|wav|ogg|m4a|aac|flac)/
    const allowedExtensions = /\.(mp3|wav|ogg|m4a|aac|flac)$/i
    
    // Check MIME type and extension
    if (!allowedTypes.test(file.mimetype) && !allowedExtensions.test(file.originalname)) {
      return cb(new CustomError('Invalid file type. Only audio files (mp3, wav, ogg, m4a, aac, flac) are allowed.', 400))
    }
    
    cb(null, true)
  }
})

// Helper function to validate audio file
async function validateAudioFile(filePath: string): Promise<{ valid: boolean; duration?: number; error?: string }> {
  try {
    const metadata = await parseFile(filePath)
    // Check if it's actually an audio file
    if (!metadata.format.container || !metadata.format.codec) {
      return { valid: false, error: 'File is not a valid audio file' }
    }
    return { valid: true, duration: metadata.format.duration }
  } catch (error) {
    return { valid: false, error: 'Failed to parse audio file' }
  }
}

// Get all songs (public)
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const songs = await dbAll(`
      SELECT 
        s.*,
        COUNT(DISTINCT l.id) as like_count,
        COUNT(DISTINCT f.id) as favorite_count
      FROM songs s
      LEFT JOIN likes l ON l.song_id = s.id
      LEFT JOIN favorites f ON f.song_id = s.id
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `)

    res.json(songs)
  } catch (error) {
    next(error)
  }
})

// Get songs by album (must come before /:id to avoid route conflicts)
router.get('/album/:albumId', optionalAuth, async (req, res, next) => {
  try {
    const songs = await dbAll('SELECT * FROM songs WHERE album_id = ? ORDER BY created_at ASC', [req.params.albumId])
    res.json(songs)
  } catch (error) {
    next(error)
  }
})

// Get song by ID
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const song = await dbGet('SELECT * FROM songs WHERE id = ?', [req.params.id])
    
    if (!song) {
      throw new CustomError('Song not found', 404)
    }

    // Get tracks for this song
    const tracks = await dbAll('SELECT * FROM tracks WHERE song_id = ?', [req.params.id])
    
    res.json({ ...song, tracks })
  } catch (error) {
    next(error)
  }
})

// Create song with tracks (requires authentication and premium subscription)
router.post('/', authenticate, requirePremium, upload.array('tracks'), async (req: AuthRequest, res, next) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      throw new CustomError('Unauthorized', 401)
    }

    const { title, artist, albumId } = req.body
    const files = req.files as Express.Multer.File[]

    if (!title || !albumId || !files || files.length === 0) {
      throw new CustomError('Missing required fields', 400)
    }

    // Verify user owns the album
    const album = await dbGet('SELECT * FROM albums WHERE id = ?', [albumId])
    if (!album) {
      throw new CustomError('Album not found', 404)
    }
    if (album.artist_id !== userId) {
      throw new CustomError('Forbidden: You can only add songs to your own albums', 403)
    }

    const songId = uuidv4()
    await dbRun(
      `INSERT INTO songs (id, title, artist, album_id)
       VALUES (?, ?, ?, ?)`,
      [songId, title, artist || req.body.artist, albumId]
    )

    // Create tracks for uploaded files
    const trackNames = JSON.parse(req.body.trackNames || '[]')
    const tracks = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const trackName = trackNames[i] || `Track ${i + 1}`
      const filePath = path.join(uploadDir, file.filename)
      
      // Validate audio file
      const validation = await validateAudioFile(filePath)
      if (!validation.valid) {
        // Delete invalid file
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }
        throw new CustomError(
          `Invalid audio file "${file.originalname}": ${validation.error || 'File is not a valid audio file'}`,
          400
        )
      }

      const trackId = uuidv4()
      const duration = validation.duration || null
      
      await dbRun(
        `INSERT INTO tracks (id, song_id, name, file_path, enabled)
         VALUES (?, ?, ?, ?, 1)`,
        [trackId, songId, trackName, `/uploads/${file.filename}`]
      )

      tracks.push({
        id: trackId,
        name: trackName,
        url: `/uploads/${file.filename}`,
        enabled: true
      })
    }

    // Update song duration if we have track durations
    const durations: number[] = []
    for (const file of files) {
      const filePath = path.join(uploadDir, file.filename)
      try {
        const metadata = await parseFile(filePath)
        if (metadata.format.duration) {
          durations.push(metadata.format.duration)
        }
      } catch (error) {
        // Skip if we can't get duration
      }
    }
    if (durations.length > 0) {
      const maxDuration = Math.max(...durations)
      await dbRun('UPDATE songs SET duration = ? WHERE id = ?', [maxDuration, songId])
    }

    const song = await dbGet('SELECT * FROM songs WHERE id = ?', [songId])
    res.status(201).json({ ...song, tracks })
  } catch (error) {
    next(error)
  }
})

// Update song (requires authentication and ownership)
router.put('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      throw new CustomError('Unauthorized', 401)
    }

    // Check if song exists and user owns the album
    const song = await dbGet('SELECT * FROM songs WHERE id = ?', [req.params.id])
    if (!song) {
      throw new CustomError('Song not found', 404)
    }

    const album = await dbGet('SELECT * FROM albums WHERE id = ?', [(song as any).album_id]) as any
    if (!album || album.artist_id !== userId) {
      throw new CustomError('Forbidden: You can only edit songs in your own albums', 403)
    }

    const { title, artist, duration, coverImage } = req.body

    await dbRun(
      `UPDATE songs 
       SET title = COALESCE(?, title),
           artist = COALESCE(?, artist),
           duration = COALESCE(?, duration),
           cover_image = COALESCE(?, cover_image)
       WHERE id = ?`,
      [title, artist, duration, coverImage, req.params.id]
    )

    const updated = await dbGet('SELECT * FROM songs WHERE id = ?', [req.params.id])
    res.json(updated)
  } catch (error) {
    next(error)
  }
})

// Delete song (requires authentication and ownership)
router.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      throw new CustomError('Unauthorized', 401)
    }

    // Check if song exists and user owns the album
    const song = await dbGet('SELECT * FROM songs WHERE id = ?', [req.params.id])
    if (!song) {
      throw new CustomError('Song not found', 404)
    }

    const album = await dbGet('SELECT * FROM albums WHERE id = ?', [(song as any).album_id]) as any
    if (!album || album.artist_id !== userId) {
      throw new CustomError('Forbidden: You can only delete songs from your own albums', 403)
    }

    // Get track file paths before deleting
    const tracks = await dbAll('SELECT file_path FROM tracks WHERE song_id = ?', [req.params.id]) as Array<{ file_path: string }>
    
    // Delete files
    tracks.forEach((track) => {
      const filePath = path.join(process.cwd(), track.file_path.replace(/^\//, ''))
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    })

    await dbRun('DELETE FROM songs WHERE id = ?', [req.params.id])
    res.status(204).send()
  } catch (error) {
    next(error)
  }
})

export default router

