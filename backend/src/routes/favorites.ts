import express from 'express'
import { db } from '../database/init.js'
import { v4 as uuidv4 } from 'uuid'
import { promisify } from 'util'
import { authenticate, optionalAuth, getUserId, AuthRequest } from '../middleware/auth.js'
import { CustomError } from '../middleware/errorHandler'

const router = express.Router()
const dbRun = promisify(db.run.bind(db))
const dbGet = promisify(db.get.bind(db))
const dbAll = promisify(db.all.bind(db))

// Get user favorites
router.get('/user/:userId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = getUserId(req)
    if (!userId || userId !== req.params.userId) {
      throw new CustomError('Unauthorized', 401)
    }

    const favorites = await dbAll(
      `SELECT f.*, s.title, s.artist, s.album_id
       FROM favorites f
       JOIN songs s ON s.id = f.song_id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC`,
      [req.params.userId]
    )
    res.json(favorites)
  } catch (error) {
    next(error)
  }
})

// Get favorite count for song
router.get('/song/:songId/count', optionalAuth, async (req, res, next) => {
  try {
    const result = await dbGet(
      'SELECT COUNT(*) as count FROM favorites WHERE song_id = ?',
      [req.params.songId]
    )
    res.json({ count: result?.count || 0 })
  } catch (error) {
    next(error)
  }
})

// Check if user favorited song
router.get('/check/:userId/:songId', optionalAuth, async (req, res, next) => {
  try {
    const favorite = await dbGet(
      'SELECT * FROM favorites WHERE user_id = ? AND song_id = ?',
      [req.params.userId, req.params.songId]
    )
    res.json({ isFavorited: !!favorite })
  } catch (error) {
    next(error)
  }
})

// Toggle favorite (requires authentication)
router.post('/toggle', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      throw new CustomError('Unauthorized', 401)
    }

    const { songId } = req.body

    if (!songId) {
      throw new CustomError('Missing required fields', 400)
    }

    // Use authenticated user's ID

    // Check if already favorited
    const existing = await dbGet(
      'SELECT * FROM favorites WHERE user_id = ? AND song_id = ?',
      [userId, songId]
    )

    if (existing) {
      // Unfavorite
      await dbRun(
        'DELETE FROM favorites WHERE user_id = ? AND song_id = ?',
        [userId, songId]
      )
      res.json({ isFavorited: false })
    } else {
      // Favorite
      const favoriteId = uuidv4()
      await dbRun(
        `INSERT INTO favorites (id, user_id, song_id)
         VALUES (?, ?, ?)`,
        [favoriteId, userId, songId]
      )
      res.json({ isFavorited: true })
    }
  } catch (error) {
    next(error)
  }
})

export default router

