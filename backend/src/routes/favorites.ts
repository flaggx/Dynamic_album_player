import express from 'express'
import { db } from '../database/init.js'
import { v4 as uuidv4 } from 'uuid'
import { promisify } from 'util'

const router = express.Router()
const dbRun = promisify(db.run.bind(db))
const dbGet = promisify(db.get.bind(db))
const dbAll = promisify(db.all.bind(db))

// Get user favorites
router.get('/user/:userId', async (req, res) => {
  try {
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
    console.error('Error fetching favorites:', error)
    res.status(500).json({ error: 'Failed to fetch favorites' })
  }
})

// Get favorite count for song
router.get('/song/:songId/count', async (req, res) => {
  try {
    const result = await dbGet(
      'SELECT COUNT(*) as count FROM favorites WHERE song_id = ?',
      [req.params.songId]
    )
    res.json({ count: result?.count || 0 })
  } catch (error) {
    console.error('Error fetching favorite count:', error)
    res.status(500).json({ error: 'Failed to fetch favorite count' })
  }
})

// Check if user favorited song
router.get('/check/:userId/:songId', async (req, res) => {
  try {
    const favorite = await dbGet(
      'SELECT * FROM favorites WHERE user_id = ? AND song_id = ?',
      [req.params.userId, req.params.songId]
    )
    res.json({ isFavorited: !!favorite })
  } catch (error) {
    console.error('Error checking favorite:', error)
    res.status(500).json({ error: 'Failed to check favorite' })
  }
})

// Toggle favorite
router.post('/toggle', async (req, res) => {
  try {
    const { userId, songId } = req.body

    if (!userId || !songId) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

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
    console.error('Error toggling favorite:', error)
    res.status(500).json({ error: 'Failed to toggle favorite' })
  }
})

export default router

