import { describe, it, expect, beforeEach, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import { db } from '../../database/init'
import { promisify } from 'util'
import { errorHandler } from '../../middleware/errorHandler.js'

const dbRun = promisify(db.run.bind(db)) as (sql: string, ...params: any[]) => Promise<any>

// Mock authentication middleware - must be before route imports
vi.mock('../../middleware/auth.js', () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.auth = { sub: 'user1' }
    next()
  },
  optionalAuth: (req: any, res: any, next: any) => {
    req.auth = { sub: 'user1' }
    next()
  },
  getUserId: (req: any) => req.auth?.sub || 'user1',
  AuthRequest: {} as any,
}))

import likeRoutes from '../likes'

const app = express()
app.use(express.json())
app.use('/api/likes', likeRoutes)
app.use(errorHandler)

describe('Likes API', () => {
  beforeEach(async () => {
    // Global beforeEach already clears data, just insert test data
    await dbRun(
      `INSERT OR IGNORE INTO users (id, email, name) VALUES (?, ?, ?)`,
      ['user1', 'user1@example.com', 'User 1']
    )
    await dbRun(
      `INSERT OR IGNORE INTO albums (id, title, artist, artist_id)
       VALUES (?, ?, ?, ?)`,
      ['album1', 'Test Album', 'Test Artist', 'user1']
    )
    await dbRun(
      `INSERT OR IGNORE INTO songs (id, title, artist, album_id)
       VALUES (?, ?, ?, ?)`,
      ['song1', 'Test Song', 'Test Artist', 'album1']
    )
  })

  describe('POST /api/likes/toggle', () => {
    it('should like a song', async () => {
      const response = await request(app)
        .post('/api/likes/toggle')
        .send({ songId: 'song1' })

      expect(response.status).toBe(200)
      expect(response.body.isLiked).toBe(true)
    })

    it('should unlike a song', async () => {
      // First like using the API
      const likeResponse = await request(app)
        .post('/api/likes/toggle')
        .send({ songId: 'song1' })
      
      expect(likeResponse.status).toBe(200)
      expect(likeResponse.body.isLiked).toBe(true)

      // Then unlike (toggle again)
      const response = await request(app)
        .post('/api/likes/toggle')
        .send({ songId: 'song1' })

      expect(response.status).toBe(200)
      expect(response.body.isLiked).toBe(false)
    })
  })

  describe('GET /api/likes/song/:songId/count', () => {
    it('should return like count', async () => {
      // Create second user for the test
      await dbRun(
        `INSERT OR IGNORE INTO users (id, email, name) VALUES (?, ?, ?)`,
        ['user2', 'user2@example.com', 'User 2']
      )
      
      // Ensure no existing likes for this song
      await dbRun('DELETE FROM likes WHERE song_id = ?', ['song1'])
      
      // Create like for user1 directly in database (more reliable than API toggle)
      await dbRun(
        `INSERT INTO likes (id, user_id, song_id)
         VALUES (?, ?, ?)`,
        ['like1', 'user1', 'song1']
      )
      
      // Create like for user2 directly in database
      await dbRun(
        `INSERT INTO likes (id, user_id, song_id)
         VALUES (?, ?, ?)`,
        ['like2', 'user2', 'song1']
      )

      const response = await request(app)
        .get('/api/likes/song/song1/count')

      expect(response.status).toBe(200)
      expect(response.body.count).toBe(2)
    })
  })

  describe('GET /api/likes/check/:userId/:songId', () => {
    it('should return false when not liked', async () => {
      const response = await request(app)
        .get('/api/likes/check/user1/song1')

      expect(response.status).toBe(200)
      expect(response.body.isLiked).toBe(false)
    })

    it('should return true when liked', async () => {
      await dbRun(
        `INSERT INTO likes (id, user_id, song_id)
         VALUES (?, ?, ?)`,
        ['like1', 'user1', 'song1']
      )

      const response = await request(app)
        .get('/api/likes/check/user1/song1')

      expect(response.status).toBe(200)
      expect(response.body.isLiked).toBe(true)
    })
  })
})

