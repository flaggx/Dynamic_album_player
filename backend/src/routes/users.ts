import express from 'express'
import { db } from '../database/init.js'
import { promisify } from 'util'

const router = express.Router()
const dbGet = promisify(db.get.bind(db))
const dbRun = promisify(db.run.bind(db))

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await dbGet('SELECT * FROM users WHERE id = ?', [req.params.id])
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json(user)
  } catch (error) {
    console.error('Error fetching user:', error)
    res.status(500).json({ error: 'Failed to fetch user' })
  }
})

// Create or update user
router.post('/', async (req, res) => {
  try {
    const { id, email, name, picture, bio } = req.body

    if (!id || !email) {
      return res.status(400).json({ error: 'Missing required fields' })
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
    console.error('Error creating/updating user:', error)
    res.status(500).json({ error: 'Failed to create/update user' })
  }
})

export default router

