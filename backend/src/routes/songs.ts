import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { db } from '../database/init'
import { v4 as uuidv4 } from 'uuid'
import { promisify } from 'util'

const router = express.Router()
const dbRun = promisify(db.run.bind(db))
const dbGet = promisify(db.get.bind(db))
const dbAll = promisify(db.all.bind(db))

// Configure multer for file uploads
const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`)
  }
})

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') // 10MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /audio\/(mp3|wav|ogg|m4a|aac|flac)/
    if (allowedTypes.test(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type. Only audio files are allowed.'))
    }
  }
})

// Get all songs
router.get('/', async (req, res) => {
  try {
    const songs = await dbAll(`
      SELECT 
        s.*,
        COUNT(DISTINCT l.id) as like_count,
        COUNT(DISTINCT f.id) as favorite_count
      FROM songs s
      LEFT JOIN likes l ON l.song_id = s.id
      LEFT JOIN favorites f ON f.song_id = s.id
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `)

    res.json(songs)
  } catch (error) {
    console.error('Error fetching songs:', error)
    res.status(500).json({ error: 'Failed to fetch songs' })
  }
})

// Get song by ID
router.get('/:id', async (req, res) => {
  try {
    const song = await dbGet('SELECT * FROM songs WHERE id = ?', [req.params.id])
    
    if (!song) {
      return res.status(404).json({ error: 'Song not found' })
    }

    // Get tracks for this song
    const tracks = await dbAll('SELECT * FROM tracks WHERE song_id = ?', [req.params.id])
    
    res.json({ ...song, tracks })
  } catch (error) {
    console.error('Error fetching song:', error)
    res.status(500).json({ error: 'Failed to fetch song' })
  }
})

// Get songs by album
router.get('/album/:albumId', async (req, res) => {
  try {
    const songs = await dbAll('SELECT * FROM songs WHERE album_id = ? ORDER BY created_at ASC', [req.params.albumId])
    res.json(songs)
  } catch (error) {
    console.error('Error fetching album songs:', error)
    res.status(500).json({ error: 'Failed to fetch album songs' })
  }
})

// Create song with tracks
router.post('/', upload.array('tracks'), async (req, res) => {
  try {
    const { title, artist, albumId } = req.body
    const files = req.files as Express.Multer.File[]

    if (!title || !albumId || !files || files.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const songId = uuidv4()
    await dbRun(
      `INSERT INTO songs (id, title, artist, album_id)
       VALUES (?, ?, ?, ?)`,
      [songId, title, artist || req.body.artist, albumId]
    )

    // Create tracks for uploaded files
    const trackNames = JSON.parse(req.body.trackNames || '[]')
    const tracks = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const trackName = trackNames[i] || `Track ${i + 1}`
      const trackId = uuidv4()
      
      await dbRun(
        `INSERT INTO tracks (id, song_id, name, file_path, enabled)
         VALUES (?, ?, ?, ?, 1)`,
        [trackId, songId, trackName, `/uploads/${file.filename}`]
      )

      tracks.push({
        id: trackId,
        name: trackName,
        url: `/uploads/${file.filename}`,
        enabled: true
      })
    }

    const song = await dbGet('SELECT * FROM songs WHERE id = ?', [songId])
    res.status(201).json({ ...song, tracks })
  } catch (error) {
    console.error('Error creating song:', error)
    res.status(500).json({ error: 'Failed to create song' })
  }
})

// Update song
router.put('/:id', async (req, res) => {
  try {
    const { title, artist, duration, coverImage } = req.body

    await dbRun(
      `UPDATE songs 
       SET title = COALESCE(?, title),
           artist = COALESCE(?, artist),
           duration = COALESCE(?, duration),
           cover_image = COALESCE(?, cover_image)
       WHERE id = ?`,
      [title, artist, duration, coverImage, req.params.id]
    )

    const song = await dbGet('SELECT * FROM songs WHERE id = ?', [req.params.id])
    res.json(song)
  } catch (error) {
    console.error('Error updating song:', error)
    res.status(500).json({ error: 'Failed to update song' })
  }
})

// Delete song
router.delete('/:id', async (req, res) => {
  try {
    // Get track file paths before deleting
    const tracks = await dbAll('SELECT file_path FROM tracks WHERE song_id = ?', [req.params.id])
    
    // Delete files
    tracks.forEach((track: { file_path: string }) => {
      const filePath = path.join(process.cwd(), track.file_path.replace(/^\//, ''))
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    })

    await dbRun('DELETE FROM songs WHERE id = ?', [req.params.id])
    res.status(204).send()
  } catch (error) {
    console.error('Error deleting song:', error)
    res.status(500).json({ error: 'Failed to delete song' })
  }
})

export default router

