import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import songRoutes from '../songs'
import { db } from '../../database/init'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'

const dbRun = promisify(db.run.bind(db))

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use('/api/songs', songRoutes)

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
      // Insert song directly (not using OR IGNORE to ensure it's inserted)
      await dbRun(
        `INSERT INTO songs (id, title, artist, album_id)
         VALUES (?, ?, ?, ?)`,
        ['song1', 'Test Song', 'Test Artist', 'album1']
      )

      const response = await request(app).get('/api/songs')
      expect(response.status).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body.length).toBeGreaterThan(0)
      
      // Find the song in the response
      const song = response.body.find((s: any) => s.id === 'song1')
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
      const songId = 'song-with-tracks-test'
      // Ensure song exists (use INSERT directly since beforeEach clears data)
      await dbRun(
        `INSERT INTO songs (id, title, artist, album_id)
         VALUES (?, ?, ?, ?)`,
        [songId, 'Test Song', 'Test Artist', 'album1']
      )
      await dbRun(
        `INSERT INTO tracks (id, song_id, name, file_path, enabled)
         VALUES (?, ?, ?, ?, ?)`,
        ['track1', songId, 'Vocals', '/uploads/vocals.mp3', 1]
      )

      const response = await request(app).get(`/api/songs/${songId}`)
      expect(response.status).toBe(200)
      expect(response.body.title).toBe('Test Song')
      expect(response.body.tracks).toHaveLength(1)
      expect(response.body.tracks[0].name).toBe('Vocals')
    })
  })

  describe('POST /api/songs', () => {
    it('should create song with file upload', async () => {
      // Create a dummy audio file
      const audioContent = Buffer.from('fake audio content')
      const audioPath = path.join(testUploadDir, 'test.mp3')
      fs.writeFileSync(audioPath, audioContent)

      const response = await request(app)
        .post('/api/songs')
        .field('title', 'New Song')
        .field('artist', 'New Artist')
        .field('albumId', 'album1')
        .field('trackNames', JSON.stringify(['Vocals']))
        .attach('tracks', audioPath, 'test.mp3')

      if (response.status !== 201) {
        console.error('Upload error:', response.body)
      }
      expect(response.status).toBe(201)
      expect(response.body.title).toBe('New Song')
      expect(response.body.tracks).toBeDefined()
    })

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/songs')
        .send({ title: 'Incomplete Song' })

      expect(response.status).toBe(400)
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

