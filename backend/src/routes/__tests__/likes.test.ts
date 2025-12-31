import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import likeRoutes from '../likes'
import { db } from '../../database/init'
import { promisify } from 'util'

const dbRun = promisify(db.run.bind(db))

const app = express()
app.use(express.json())
app.use('/api/likes', likeRoutes)

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
        .send({ userId: 'user1', songId: 'song1' })

      expect(response.status).toBe(200)
      expect(response.body.isLiked).toBe(true)
    })

    it('should unlike a song', async () => {
      // First like using the API
      const likeResponse = await request(app)
        .post('/api/likes/toggle')
        .send({ userId: 'user1', songId: 'song1' })
      
      expect(likeResponse.status).toBe(200)
      expect(likeResponse.body.isLiked).toBe(true)

      // Then unlike (toggle again)
      const response = await request(app)
        .post('/api/likes/toggle')
        .send({ userId: 'user1', songId: 'song1' })

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
      
      // Use the API to create likes to ensure they're properly inserted
      await request(app)
        .post('/api/likes/toggle')
        .send({ userId: 'user1', songId: 'song1' })
      
      await request(app)
        .post('/api/likes/toggle')
        .send({ userId: 'user2', songId: 'song1' })

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

