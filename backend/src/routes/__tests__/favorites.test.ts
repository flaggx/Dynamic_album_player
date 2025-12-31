import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import favoriteRoutes from '../favorites'
import { db } from '../../database/init'
import { promisify } from 'util'

const dbRun = promisify(db.run.bind(db))

const app = express()
app.use(express.json())
app.use('/api/favorites', favoriteRoutes)

describe('Favorites API', () => {
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

  describe('POST /api/favorites/toggle', () => {
    it('should favorite a song', async () => {
      const response = await request(app)
        .post('/api/favorites/toggle')
        .send({ userId: 'user1', songId: 'song1' })

      expect(response.status).toBe(200)
      expect(response.body.isFavorited).toBe(true)
    })

    it('should unfavorite a song', async () => {
      // Ensure no existing favorite (global beforeEach should handle this, but be explicit)
      await dbRun('DELETE FROM favorites WHERE user_id = ? AND song_id = ?', ['user1', 'song1'])
      
      // First favorite using the API
      const favoriteResponse = await request(app)
        .post('/api/favorites/toggle')
        .send({ userId: 'user1', songId: 'song1' })
      
      expect(favoriteResponse.status).toBe(200)
      expect(favoriteResponse.body.isFavorited).toBe(true)

      // Verify favorite was created in database
      const checkFavorite = await new Promise((resolve) => {
        db.get('SELECT * FROM favorites WHERE user_id = ? AND song_id = ?', ['user1', 'song1'], (err, row) => {
          resolve(row)
        })
      })
      expect(checkFavorite).toBeDefined()

      // Then unfavorite (toggle again)
      const response = await request(app)
        .post('/api/favorites/toggle')
        .send({ userId: 'user1', songId: 'song1' })

      expect(response.status).toBe(200)
      expect(response.body.isFavorited).toBe(false)
      
      // Verify favorite was removed from database
      const checkUnfavorite = await new Promise((resolve) => {
        db.get('SELECT * FROM favorites WHERE user_id = ? AND song_id = ?', ['user1', 'song1'], (err, row) => {
          resolve(row)
        })
      })
      expect(checkUnfavorite).toBeUndefined()
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

