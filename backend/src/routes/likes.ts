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

// Get like count for song
router.get('/song/:songId/count', optionalAuth, async (req, res, next) => {
  try {
    const result = await dbGet(
      'SELECT COUNT(*) as count FROM likes WHERE song_id = ?',
      [req.params.songId]
    )
    // SQLite COUNT returns a number, ensure it's converted properly
    const count = result?.count ? Number(result.count) : 0
    res.json({ count })
  } catch (error) {
    next(error)
  }
})

// Check if user liked song
router.get('/check/:userId/:songId', optionalAuth, async (req, res, next) => {
  try {
    const like = await dbGet(
      'SELECT * FROM likes WHERE user_id = ? AND song_id = ?',
      [req.params.userId, req.params.songId]
    )
    res.json({ isLiked: !!like })
  } catch (error) {
    next(error)
  }
})

// Toggle like (requires authentication)
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

    // Check if already liked
    const existing = await dbGet(
      'SELECT * FROM likes WHERE user_id = ? AND song_id = ?',
      [userId, songId]
    )

    if (existing) {
      // Unlike
      await dbRun(
        'DELETE FROM likes WHERE user_id = ? AND song_id = ?',
        [userId, songId]
      )
      res.json({ isLiked: false })
    } else {
      // Like
      const likeId = uuidv4()
      await dbRun(
        `INSERT INTO likes (id, user_id, song_id)
         VALUES (?, ?, ?)`,
        [likeId, userId, songId]
      )
      res.json({ isLiked: true })
    }
  } catch (error) {
    next(error)
  }
})

export default router

