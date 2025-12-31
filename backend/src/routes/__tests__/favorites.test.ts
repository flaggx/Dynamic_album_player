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

import favoriteRoutes from '../favorites'

const app = express()
app.use(express.json())
app.use('/api/favorites', favoriteRoutes)
app.use(errorHandler)

describe('Favorites API', () => {
  beforeEach(async () => {
    // Global beforeEach already clears data, just insert test data
    // Add small delay to ensure cleanup completes
    await new Promise(resolve => setTimeout(resolve, 10))
    
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
    
    // Ensure inserts complete
    await new Promise(resolve => setTimeout(resolve, 10))
  })

  describe('POST /api/favorites/toggle', () => {
    it('should favorite a song', async () => {
      // Ensure no existing favorite (global beforeEach should handle this)
      // But explicitly delete to be sure
      try {
        await dbRun('DELETE FROM favorites WHERE user_id = ? AND song_id = ?', ['user1', 'song1'])
      } catch (err) {
        // Ignore errors - might not exist or database might be busy
      }
      
      const response = await request(app)
        .post('/api/favorites/toggle')
        .send({ songId: 'song1' })

      // If we get a 503 (database busy), retry once
      if (response.status === 503) {
        await new Promise(resolve => setTimeout(resolve, 200))
        const retryResponse = await request(app)
          .post('/api/favorites/toggle')
          .send({ songId: 'song1' })
        expect(retryResponse.status).toBe(200)
        expect(retryResponse.body.isFavorited).toBe(true)
      } else {
        expect(response.status).toBe(200)
        expect(response.body.isFavorited).toBe(true)
      }
    })

    it('should unfavorite a song', async () => {
      // Ensure no existing favorite (global beforeEach should handle this, but be explicit)
      await dbRun('DELETE FROM favorites WHERE user_id = ? AND song_id = ?', ['user1', 'song1'])
      
      // First favorite using the API
      const favoriteResponse = await request(app)
        .post('/api/favorites/toggle')
        .send({ songId: 'song1' })
      
      expect(favoriteResponse.status).toBe(200)
      expect(favoriteResponse.body.isFavorited).toBe(true)

      // Then unfavorite (toggle again) - no need to check database, just verify the API response
      const response = await request(app)
        .post('/api/favorites/toggle')
        .send({ songId: 'song1' })

      expect(response.status).toBe(200)
      expect(response.body.isFavorited).toBe(false)
    })
  })

  describe('GET /api/favorites/song/:songId/count', () => {
    it('should return favorite count', async () => {
      await dbRun(
        `INSERT INTO favorites (id, user_id, song_id)
         VALUES (?, ?, ?)`,
        ['fav1', 'user1', 'song1']
      )

      const response = await request(app)
        .get('/api/favorites/song/song1/count')

      expect(response.status).toBe(200)
      expect(response.body.count).toBe(1)
    })
  })

  describe('GET /api/favorites/check/:userId/:songId', () => {
    it('should return false when not favorited', async () => {
      const response = await request(app)
        .get('/api/favorites/check/user1/song1')

      expect(response.status).toBe(200)
      expect(response.body.isFavorited).toBe(false)
    })

    it('should return true when favorited', async () => {
      await dbRun(
        `INSERT INTO favorites (id, user_id, song_id)
         VALUES (?, ?, ?)`,
        ['fav1', 'user1', 'song1']
      )

      const response = await request(app)
        .get('/api/favorites/check/user1/song1')

      expect(response.status).toBe(200)
      expect(response.body.isFavorited).toBe(true)
    })
  })

  describe('GET /api/favorites/user/:userId', () => {
    it('should return user favorites', async () => {
      await dbRun(
        `INSERT INTO favorites (id, user_id, song_id)
         VALUES (?, ?, ?)`,
        ['fav1', 'user1', 'song1']
      )

      const response = await request(app)
        .get('/api/favorites/user/user1')

      expect(response.status).toBe(200)
      expect(response.body).toHaveLength(1)
      expect(response.body[0].song_id).toBe('song1')
    })
  })
})

