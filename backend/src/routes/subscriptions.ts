import express from 'express'
import { db } from '../database/init.js'
import { v4 as uuidv4 } from 'uuid'
import { promisify } from 'util'
import { authenticate, optionalAuth, getUserId, AuthRequest } from '../middleware/auth.js'
import { CustomError } from '../middleware/errorHandler'

const router = express.Router()
const dbRun = promisify(db.run.bind(db)) as (sql: string, params?: any[]) => Promise<any>
const dbGet = promisify(db.get.bind(db)) as (sql: string, params?: any[]) => Promise<any>
const dbAll = promisify(db.all.bind(db)) as (sql: string, params?: any[]) => Promise<any[]>

// Get user subscriptions
router.get('/user/:userId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = getUserId(req)
    if (!userId || userId !== req.params.userId) {
      throw new CustomError('Unauthorized', 401)
    }

    const subscriptions = await dbAll(
      'SELECT * FROM subscriptions WHERE user_id = ?',
      [req.params.userId]
    )
    res.json(subscriptions)
  } catch (error) {
    next(error)
  }
})

// Check if user is subscribed
router.get('/check/:userId/:artistId', optionalAuth, async (req, res, next) => {
  try {
    const subscription = await dbGet(
      'SELECT * FROM subscriptions WHERE user_id = ? AND artist_id = ?',
      [req.params.userId, req.params.artistId]
    )
    res.json({ isSubscribed: !!subscription })
  } catch (error) {
    next(error)
  }
})

// Subscribe to artist (requires authentication)
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      throw new CustomError('Unauthorized', 401)
    }

    const { artistId } = req.body

    if (!artistId) {
      throw new CustomError('Missing required fields', 400)
    }

    if (userId === artistId) {
      throw new CustomError('Cannot subscribe to yourself', 400)
    }

    // Use authenticated user's ID

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
    next(error)
  }
})

// Unsubscribe from artist (requires authentication)
router.delete('/:artistId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      throw new CustomError('Unauthorized', 401)
    }

    const artistId = req.params.artistId

    await dbRun(
      'DELETE FROM subscriptions WHERE user_id = ? AND artist_id = ?',
      [userId, artistId]
    )
    res.status(204).send()
  } catch (error) {
    next(error)
  }
})

// Get subscriber count for artist
router.get('/artist/:artistId/count', optionalAuth, async (req, res, next) => {
  try {
    const result = await dbGet(
      'SELECT COUNT(*) as count FROM subscriptions WHERE artist_id = ?',
      [req.params.artistId]
    )
    const count = result?.count ? Number(result.count) : 0
    res.json({ count })
  } catch (error) {
    next(error)
  }
})

export default router

