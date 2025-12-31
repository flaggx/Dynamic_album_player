import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import { db } from '../../database/init'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'

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

import albumRoutes from '../albums'
import { errorHandler } from '../../middleware/errorHandler.js'

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use('/api/albums', albumRoutes)
app.use(errorHandler)

// Create test uploads directory
const testUploadDir = path.join(__dirname, '../../../test-uploads')
if (!fs.existsSync(testUploadDir)) {
  fs.mkdirSync(testUploadDir, { recursive: true })
}

// Set test upload directory
process.env.UPLOAD_DIR = testUploadDir

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
      // Clear in correct order to respect foreign keys
      await dbRun('DELETE FROM likes')
      await dbRun('DELETE FROM favorites')
      await dbRun('DELETE FROM tracks')
      await dbRun('DELETE FROM songs')
      await dbRun('DELETE FROM subscriptions')
      await dbRun('DELETE FROM albums')
      
      const response = await request(app).get('/api/albums')
      expect(response.status).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body.length).toBe(0)
    })

    it('should return all albums', async () => {
      // Create test album - use unique ID to avoid conflicts
      const albumId = `album-${Date.now()}`
      await dbRun(
        `INSERT INTO albums (id, title, artist, artist_id, description)
         VALUES (?, ?, ?, ?, ?)`,
        [albumId, 'Test Album', 'Test Artist', 'user1', 'Test description']
      )

      const response = await request(app).get('/api/albums')
      expect(response.status).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body.length).toBeGreaterThan(0)
      const album = response.body.find((a: any) => a.id === albumId)
      expect(album).toBeDefined()
      expect(album?.title).toBe('Test Album')
    })

    it('should filter albums by search query in title', async () => {
      const albumId1 = `rock-${Date.now()}`
      const albumId2 = `jazz-${Date.now()}`
      await dbRun(
        `INSERT INTO albums (id, title, artist, artist_id)
         VALUES (?, ?, ?, ?)`,
        [albumId1, 'Rock Album', 'Rock Artist', 'user1']
      )
      await dbRun(
        `INSERT INTO albums (id, title, artist, artist_id)
         VALUES (?, ?, ?, ?)`,
        [albumId2, 'Jazz Album', 'Jazz Artist', 'user1']
      )

      const response = await request(app).get('/api/albums?search=Rock')
      expect(response.status).toBe(200)
      expect(response.body.length).toBeGreaterThan(0)
      expect(response.body.some((a: any) => a.title.toLowerCase().includes('rock'))).toBe(true)
    })

    it('should filter albums by search query in artist', async () => {
      const albumId1 = `album-rock-${Date.now()}`
      const albumId2 = `album-jazz-${Date.now()}`
      await dbRun(
        `INSERT INTO albums (id, title, artist, artist_id)
         VALUES (?, ?, ?, ?)`,
        [albumId1, 'Album 1', 'Rock Artist', 'user1']
      )
      await dbRun(
        `INSERT INTO albums (id, title, artist, artist_id)
         VALUES (?, ?, ?, ?)`,
        [albumId2, 'Album 2', 'Jazz Artist', 'user1']
      )

      const response = await request(app).get('/api/albums?search=Rock')
      expect(response.status).toBe(200)
      expect(response.body.length).toBeGreaterThan(0)
      expect(response.body.some((a: any) => a.artist.toLowerCase().includes('rock'))).toBe(true)
    })

    it('should filter albums by search query in description', async () => {
      const albumId1 = `album-desc-rock-${Date.now()}`
      const albumId2 = `album-desc-jazz-${Date.now()}`
      await dbRun(
        `INSERT INTO albums (id, title, artist, artist_id, description)
         VALUES (?, ?, ?, ?, ?)`,
        [albumId1, 'Album 1', 'Artist 1', 'user1', 'This is a rock album']
      )
      await dbRun(
        `INSERT INTO albums (id, title, artist, artist_id, description)
         VALUES (?, ?, ?, ?, ?)`,
        [albumId2, 'Album 2', 'Artist 2', 'user1', 'This is a jazz album']
      )

      const response = await request(app).get('/api/albums?search=rock')
      expect(response.status).toBe(200)
      expect(response.body.length).toBeGreaterThan(0)
      expect(response.body.some((a: any) => a.description?.toLowerCase().includes('rock'))).toBe(true)
    })

    it('should return empty array when search query matches nothing', async () => {
      const albumId = `album-${Date.now()}`
      await dbRun(
        `INSERT INTO albums (id, title, artist, artist_id)
         VALUES (?, ?, ?, ?)`,
        [albumId, 'Rock Album', 'Rock Artist', 'user1']
      )

      const response = await request(app).get('/api/albums?search=NonexistentQueryThatWillNeverMatch')
      expect(response.status).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body.length).toBe(0)
    })
  })

  describe('GET /api/albums/:id', () => {
    it('should return 404 for non-existent album', async () => {
      const response = await request(app).get('/api/albums/nonexistent')
      expect(response.status).toBe(404)
    })

    it('should return album by id', async () => {
      const albumId = `album-${Date.now()}`
      await dbRun(
        `INSERT INTO albums (id, title, artist, artist_id)
         VALUES (?, ?, ?, ?)`,
        [albumId, 'Test Album', 'Test Artist', 'user1']
      )

      const response = await request(app).get(`/api/albums/${albumId}`)
      expect(response.status).toBe(200)
      expect(response.body.title).toBe('Test Album')
    })
  })

  describe('POST /api/albums', () => {
    afterEach(() => {
      // Clean up test uploads
      if (fs.existsSync(testUploadDir)) {
        const files = fs.readdirSync(testUploadDir)
        files.forEach(file => {
          if (file.startsWith('cover-')) {
            fs.unlinkSync(path.join(testUploadDir, file))
          }
        })
      }
    })

    it('should create a new album', async () => {
      const newAlbum = {
        title: 'New Album',
        artist: 'New Artist',
        description: 'Album description',
      }

      const response = await request(app)
        .post('/api/albums')
        .send(newAlbum)

      expect(response.status).toBe(201)
      expect(response.body.title).toBe('New Album')
      expect(response.body.id).toBeDefined()
    })

    it('should create album with cover image', async () => {
      // Create a dummy image file
      const imageContent = Buffer.from('fake image content')
      const imagePath = path.join(testUploadDir, 'test-cover.jpg')
      fs.writeFileSync(imagePath, imageContent)

      const response = await request(app)
        .post('/api/albums')
        .field('title', 'Album with Cover')
        .field('artist', 'Test Artist')
        .field('description', 'Album with cover image')
        .attach('coverImage', imagePath, 'test-cover.jpg')

      expect(response.status).toBe(201)
      expect(response.body.title).toBe('Album with Cover')
      expect(response.body.cover_image).toBeDefined()
      expect(response.body.cover_image).toContain('/uploads/')
    })

    it('should reject invalid image file type', async () => {
      // Create a dummy text file (not an image)
      const textContent = Buffer.from('not an image')
      const textPath = path.join(testUploadDir, 'test.txt')
      fs.writeFileSync(textPath, textContent)

      const response = await request(app)
        .post('/api/albums')
        .field('title', 'Test Album')
        .field('artist', 'Test Artist')
        .attach('coverImage', textPath, 'test.txt')

      expect(response.status).toBe(400)
      expect(response.body.error).toBeDefined()
    })

    it('should reject image file that is too large', async () => {
      // Create a large dummy image file (over 5MB)
      const largeImageContent = Buffer.alloc(6 * 1024 * 1024) // 6MB
      const largeImagePath = path.join(testUploadDir, 'large-cover.jpg')
      fs.writeFileSync(largeImagePath, largeImageContent)

      const response = await request(app)
        .post('/api/albums')
        .field('title', 'Test Album')
        .field('artist', 'Test Artist')
        .attach('coverImage', largeImagePath, 'large-cover.jpg')

      expect(response.status).toBe(400)
    })

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/albums')
        .send({ title: 'Incomplete Album' })

      expect(response.status).toBe(400)
    })
  })

  describe('PUT /api/albums/:id', () => {
    afterEach(() => {
      // Clean up test uploads
      if (fs.existsSync(testUploadDir)) {
        const files = fs.readdirSync(testUploadDir)
        files.forEach(file => {
          if (file.startsWith('cover-')) {
            fs.unlinkSync(path.join(testUploadDir, file))
          }
        })
      }
    })

    it('should update album', async () => {
      const albumId = `album-update-${Date.now()}`
      await dbRun(
        `INSERT INTO albums (id, title, artist, artist_id)
         VALUES (?, ?, ?, ?)`,
        [albumId, 'Original Title', 'Test Artist', 'user1']
      )

      const response = await request(app)
        .put(`/api/albums/${albumId}`)
        .send({ title: 'Updated Title' })

      expect(response.status).toBe(200)
      expect(response.body.title).toBe('Updated Title')
    })

    it('should update album with new cover image', async () => {
      const albumId = `album-cover-${Date.now()}`
      await dbRun(
        `INSERT INTO albums (id, title, artist, artist_id, cover_image)
         VALUES (?, ?, ?, ?, ?)`,
        [albumId, 'Test Album', 'Test Artist', 'user1', '/uploads/old-cover.jpg']
      )

      // Create a new image file
      const imageContent = Buffer.from('new cover image')
      const imagePath = path.join(testUploadDir, 'new-cover.jpg')
      fs.writeFileSync(imagePath, imageContent)

      const response = await request(app)
        .put(`/api/albums/${albumId}`)
        .field('title', 'Test Album')
        .attach('coverImage', imagePath, 'new-cover.jpg')

      expect(response.status).toBe(200)
      expect(response.body.cover_image).toBeDefined()
      expect(response.body.cover_image).toContain('/uploads/')
      expect(response.body.cover_image).not.toBe('/uploads/old-cover.jpg')
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

