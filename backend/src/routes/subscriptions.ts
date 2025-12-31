import express from 'express'
import { db } from '../database/init.js'
import { v4 as uuidv4 } from 'uuid'
import { promisify } from 'util'

const router = express.Router()
const dbRun = promisify(db.run.bind(db))
const dbGet = promisify(db.get.bind(db))
const dbAll = promisify(db.all.bind(db))

// Get user subscriptions
router.get('/user/:userId', async (req, res) => {
  try {
    const subscriptions = await dbAll(
      'SELECT * FROM subscriptions WHERE user_id = ?',
      [req.params.userId]
    )
    res.json(subscriptions)
  } catch (error) {
    console.error('Error fetching subscriptions:', error)
    res.status(500).json({ error: 'Failed to fetch subscriptions' })
  }
})

// Check if user is subscribed
router.get('/check/:userId/:artistId', async (req, res) => {
  try {
    const subscription = await dbGet(
      'SELECT * FROM subscriptions WHERE user_id = ? AND artist_id = ?',
      [req.params.userId, req.params.artistId]
    )
    res.json({ isSubscribed: !!subscription })
  } catch (error) {
    console.error('Error checking subscription:', error)
    res.status(500).json({ error: 'Failed to check subscription' })
  }
})

// Subscribe to artist
router.post('/', async (req, res) => {
  try {
    const { userId, artistId } = req.body

    if (!userId || !artistId) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Check if already subscribed
    const existing = await dbGet(
      'SELECT * FROM subscriptions WHERE user_id = ? AND artist_id = ?',
      [userId, artistId]
    )

    if (existing) {
      return res.json(existing)
    }

    const subscriptionId = uuidv4()
    await dbRun(
      `INSERT INTO subscriptions (id, user_id, artist_id)
       VALUES (?, ?, ?)`,
      [subscriptionId, userId, artistId]
    )

    const subscription = await dbGet('SELECT * FROM subscriptions WHERE id = ?', [subscriptionId])
    res.status(201).json(subscription)
  } catch (error) {
    console.error('Error creating subscription:', error)
    res.status(500).json({ error: 'Failed to create subscription' })
  }
})

// Unsubscribe from artist
router.delete('/:userId/:artistId', async (req, res) => {
  try {
    await dbRun(
      'DELETE FROM subscriptions WHERE user_id = ? AND artist_id = ?',
      [req.params.userId, req.params.artistId]
    )
    res.status(204).send()
  } catch (error) {
    console.error('Error deleting subscription:', error)
    res.status(500).json({ error: 'Failed to delete subscription' })
  }
})

export default router

