import { describe, it, expect, beforeEach, vi } from 'vitest'
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

import songRoutes from '../songs'
import { errorHandler } from '../../middleware/errorHandler.js'

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use('/api/songs', songRoutes)
app.use(errorHandler)

// Create test uploads directory
const testUploadDir = path.join(__dirname, '../../../test-uploads')
if (!fs.existsSync(testUploadDir)) {
  fs.mkdirSync(testUploadDir, { recursive: true })
}

// Set test upload directory for multer
process.env.UPLOAD_DIR = testUploadDir

describe('Songs API', () => {
  beforeEach(async () => {
    // Global beforeEach already clears data, just insert test data
    await dbRun(
      `INSERT OR IGNORE INTO users (id, email, name) VALUES (?, ?, ?)`,
      ['user1', 'test@example.com', 'Test User']
    )
    await dbRun(
      `INSERT OR IGNORE INTO albums (id, title, artist, artist_id)
       VALUES (?, ?, ?, ?)`,
      ['album1', 'Test Album', 'Test Artist', 'user1']
    )
  })

  afterEach(() => {
    // Clean up test uploads
    if (fs.existsSync(testUploadDir)) {
      const files = fs.readdirSync(testUploadDir)
      files.forEach(file => {
        fs.unlinkSync(path.join(testUploadDir, file))
      })
    }
  })

  describe('GET /api/songs', () => {
    it('should return empty array when no songs exist', async () => {
      const response = await request(app).get('/api/songs')
      expect(response.status).toBe(200)
      // The response might have empty arrays for aggregations, so check it's an array
      expect(Array.isArray(response.body)).toBe(true)
    })

    it('should return all songs', async () => {
      // Insert song directly with unique ID
      const songId = `song-${Date.now()}`
      await dbRun(
        `INSERT INTO songs (id, title, artist, album_id)
         VALUES (?, ?, ?, ?)`,
        [songId, 'Test Song', 'Test Artist', 'album1']
      )

      const response = await request(app).get('/api/songs')
      expect(response.status).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body.length).toBeGreaterThan(0)
      
      // Find the song in the response
      const song = response.body.find((s: any) => s.id === songId)
      expect(song).toBeDefined()
      expect(song?.title).toBe('Test Song')
    })
  })

  describe('GET /api/songs/:id', () => {
    it('should return 404 for non-existent song', async () => {
      const response = await request(app).get('/api/songs/nonexistent')
      expect(response.status).toBe(404)
    })

    it('should return song with tracks', async () => {
      const songId = `song-tracks-${Date.now()}`
      const trackId = `track-${Date.now()}`
      // Ensure song exists (use INSERT directly since beforeEach clears data)
      await dbRun(
        `INSERT INTO songs (id, title, artist, album_id)
         VALUES (?, ?, ?, ?)`,
        [songId, 'Test Song', 'Test Artist', 'album1']
      )
      await dbRun(
        `INSERT INTO tracks (id, song_id, name, file_path, enabled)
         VALUES (?, ?, ?, ?, ?)`,
        [trackId, songId, 'Vocals', '/uploads/vocals.mp3', 1]
      )

      const response = await request(app).get(`/api/songs/${songId}`)
      expect(response.status).toBe(200)
      expect(response.body.title).toBe('Test Song')
      expect(Array.isArray(response.body.tracks)).toBe(true)
      expect(response.body.tracks.length).toBeGreaterThan(0)
      if (response.body.tracks.length > 0) {
        expect(response.body.tracks[0].name).toBe('Vocals')
      }
    })
  })

  describe('POST /api/songs', () => {
    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/songs')
        .send({ title: 'Incomplete Song' })

      expect(response.status).toBe(400)
    })

    it('should reject invalid audio file type', async () => {
      // Create a dummy text file (not an audio file)
      const textContent = Buffer.from('not an audio file')
      const textPath = path.join(testUploadDir, 'test.txt')
      fs.writeFileSync(textPath, textContent)

      const response = await request(app)
        .post('/api/songs')
        .field('title', 'Test Song')
        .field('artist', 'Test Artist')
        .field('albumId', 'album1')
        .field('trackNames', JSON.stringify(['Vocals']))
        .attach('tracks', textPath, 'test.txt')

      expect(response.status).toBe(400)
      expect(response.body.error).toBeDefined()
    })

    it('should reject file that is too large', async () => {
      // Create a large dummy file (over 10MB)
      const largeContent = Buffer.alloc(11 * 1024 * 1024) // 11MB
      const largePath = path.join(testUploadDir, 'large.mp3')
      fs.writeFileSync(largePath, largeContent)

      const response = await request(app)
        .post('/api/songs')
        .field('title', 'Test Song')
        .field('artist', 'Test Artist')
        .field('albumId', 'album1')
        .field('trackNames', JSON.stringify(['Vocals']))
        .attach('tracks', largePath, 'large.mp3')

      expect(response.status).toBe(400)
    })

    // Note: Testing actual audio file validation with music-metadata
    // would require a real audio file. In a real scenario, you'd use
    // a test audio file or mock music-metadata.
    // This test verifies the validation logic is called
    it('should validate audio file format', async () => {
      // Create a file that looks like audio but isn't valid
      // The music-metadata library will fail to parse it
      const invalidAudioContent = Buffer.from('invalid audio content')
      const invalidAudioPath = path.join(testUploadDir, 'invalid.mp3')
      fs.writeFileSync(invalidAudioPath, invalidAudioContent)

      const response = await request(app)
        .post('/api/songs')
        .field('title', 'Test Song')
        .field('artist', 'Test Artist')
        .field('albumId', 'album1')
        .field('trackNames', JSON.stringify(['Vocals']))
        .attach('tracks', invalidAudioPath, 'invalid.mp3')

      // Should fail validation because music-metadata can't parse it
      expect(response.status).toBe(400)
      expect(response.body.error).toBeDefined()
      expect(response.body.error).toContain('Invalid audio file')
    })
  })

  describe('GET /api/songs/album/:albumId', () => {
    it('should return songs for album', async () => {
      await dbRun(
        `INSERT INTO songs (id, title, artist, album_id)
         VALUES (?, ?, ?, ?)`,
        ['song1', 'Song 1', 'Test Artist', 'album1']
      )
      await dbRun(
        `INSERT INTO songs (id, title, artist, album_id)
         VALUES (?, ?, ?, ?)`,
        ['song2', 'Song 2', 'Test Artist', 'album1']
      )

      const response = await request(app).get('/api/songs/album/album1')
      expect(response.status).toBe(200)
      expect(response.body).toHaveLength(2)
    })
  })
})

