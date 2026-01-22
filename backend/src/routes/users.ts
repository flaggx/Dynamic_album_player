import express from 'express'
import { dbGet, dbRun } from '../database/client.js'
import { authenticate, optionalAuth, getUserId, AuthRequest } from '../middleware/auth.js'
import { CustomError } from '../middleware/errorHandler'

const router = express.Router()

// Get user by ID
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const viewerId = getUserId(req)
    const user = await dbGet('SELECT * FROM users WHERE id = ?', [req.params.id])

    if (!user) {
      throw new CustomError('User not found', 404)
    }

    if (viewerId !== req.params.id) {
      const { is_admin: _omit, ...publicUser } = user as Record<string, unknown>
      res.json(publicUser)
      return
    }

    res.json(user)
  } catch (error) {
    next(error)
  }
})

// Create or update user (requires authentication, can only update own profile)
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      throw new CustomError('Unauthorized', 401)
    }

    const { id, email, name, picture, bio } = req.body

    if (!id || !email) {
      throw new CustomError('Missing required fields', 400)
    }

    // Verify user can only update their own profile
    if (id !== userId) {
      throw new CustomError('Forbidden: You can only update your own profile', 403)
    }

    // Check if user exists
    const existing = await dbGet('SELECT * FROM users WHERE id = ?', [id])

    if (existing) {
      // Update existing user
      await dbRun(
        `UPDATE users 
         SET email = COALESCE(?, email),
             name = COALESCE(?, name),
             picture = COALESCE(?, picture),
             bio = COALESCE(?, bio)
         WHERE id = ?`,
        [email, name, picture, bio, id]
      )
      const updated = await dbGet('SELECT * FROM users WHERE id = ?', [id])
      res.json(updated)
    } else {
      // Create new user
      await dbRun(
        `INSERT INTO users (id, email, name, picture, bio)
         VALUES (?, ?, ?, ?, ?)`,
        [id, email, name || null, picture || null, bio || null]
      )
      const user = await dbGet('SELECT * FROM users WHERE id = ?', [id])
      res.status(201).json(user)
    }
  } catch (error) {
    next(error)
  }
})

export default router

