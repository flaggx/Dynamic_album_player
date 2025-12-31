import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import albumRoutes from '../albums'
import { db } from '../../database/init'
import { promisify } from 'util'

const dbRun = promisify(db.run.bind(db))

const app = express()
app.use(express.json())
app.use('/api/albums', albumRoutes)

describe('Albums API', () => {
  beforeEach(async () => {
    // Create a test user (global beforeEach already clears data)
    await dbRun(
      `INSERT OR IGNORE INTO users (id, email, name) VALUES (?, ?, ?)`,
      ['user1', 'test@example.com', 'Test User']
    )
  })

  describe('GET /api/albums', () => {
    it('should return empty array when no albums exist', async () => {
      // Ensure no albums exist (global beforeEach should clear, but double-check)
      await dbRun('DELETE FROM albums')
      
      const response = await request(app).get('/api/albums')
      expect(response.status).toBe(200)
      expect(response.body).toEqual([])
    })

    it('should return all albums', async () => {
      // Create test album
      await dbRun(
        `INSERT INTO albums (id, title, artist, artist_id, description)
         VALUES (?, ?, ?, ?, ?)`,
        ['album1', 'Test Album', 'Test Artist', 'user1', 'Test description']
      )

      const response = await request(app).get('/api/albums')
      expect(response.status).toBe(200)
      expect(response.body).toHaveLength(1)
      expect(response.body[0].title).toBe('Test Album')
    })
  })

  describe('GET /api/albums/:id', () => {
    it('should return 404 for non-existent album', async () => {
      const response = await request(app).get('/api/albums/nonexistent')
      expect(response.status).toBe(404)
    })

    it('should return album by id', async () => {
      await dbRun(
        `INSERT INTO albums (id, title, artist, artist_id)
         VALUES (?, ?, ?, ?)`,
        ['album1', 'Test Album', 'Test Artist', 'user1']
      )

      const response = await request(app).get('/api/albums/album1')
      expect(response.status).toBe(200)
      expect(response.body.title).toBe('Test Album')
    })
  })

  describe('POST /api/albums', () => {
    it('should create a new album', async () => {
      const newAlbum = {
        title: 'New Album',
        artist: 'New Artist',
        artistId: 'user1',
        description: 'Album description',
      }

      const response = await request(app)
        .post('/api/albums')
        .send(newAlbum)

      expect(response.status).toBe(201)
      expect(response.body.title).toBe('New Album')
      expect(response.body.id).toBeDefined()
    })

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/albums')
        .send({ title: 'Incomplete Album' })

      expect(response.status).toBe(400)
    })
  })

  describe('PUT /api/albums/:id', () => {
    it('should update album', async () => {
      await dbRun(
        `INSERT INTO albums (id, title, artist, artist_id)
         VALUES (?, ?, ?, ?)`,
        ['album1', 'Original Title', 'Test Artist', 'user1']
      )

      const response = await request(app)
        .put('/api/albums/album1')
        .send({ title: 'Updated Title' })

      expect(response.status).toBe(200)
      expect(response.body.title).toBe('Updated Title')
    })
  })

  describe('DELETE /api/albums/:id', () => {
    it('should delete album', async () => {
      const albumId = 'delete-test-album'
      await dbRun(
        `INSERT OR IGNORE INTO albums (id, title, artist, artist_id)
         VALUES (?, ?, ?, ?)`,
        [albumId, 'Test Album', 'Test Artist', 'user1']
      )

      const response = await request(app).delete(`/api/albums/${albumId}`)
      expect(response.status).toBe(204)

      // Verify deletion
      const getResponse = await request(app).get(`/api/albums/${albumId}`)
      expect(getResponse.status).toBe(404)
    })
  })
})

