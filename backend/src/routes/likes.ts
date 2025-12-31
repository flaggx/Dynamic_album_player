import express from 'express'
import { db } from '../database/init.js'
import { v4 as uuidv4 } from 'uuid'
import { promisify } from 'util'

const router = express.Router()
const dbRun = promisify(db.run.bind(db))
const dbGet = promisify(db.get.bind(db))
const dbAll = promisify(db.all.bind(db))

// Get like count for song
router.get('/song/:songId/count', async (req, res) => {
  try {
    const result = await dbGet(
      'SELECT COUNT(*) as count FROM likes WHERE song_id = ?',
      [req.params.songId]
    )
    // SQLite COUNT returns a number, ensure it's converted properly
    const count = result?.count ? Number(result.count) : 0
    res.json({ count })
  } catch (error) {
    console.error('Error fetching like count:', error)
    res.status(500).json({ error: 'Failed to fetch like count' })
  }
})

// Check if user liked song
router.get('/check/:userId/:songId', async (req, res) => {
  try {
    const like = await dbGet(
      'SELECT * FROM likes WHERE user_id = ? AND song_id = ?',
      [req.params.userId, req.params.songId]
    )
    res.json({ isLiked: !!like })
  } catch (error) {
    console.error('Error checking like:', error)
    res.status(500).json({ error: 'Failed to check like' })
  }
})

// Toggle like
router.post('/toggle', async (req, res) => {
  try {
    const { userId, songId } = req.body

    if (!userId || !songId) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

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
    console.error('Error toggling like:', error)
    res.status(500).json({ error: 'Failed to toggle like' })
  }
})

export default router

