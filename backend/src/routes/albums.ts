import express from 'express'
import { db } from '../database/init.js'
import { v4 as uuidv4 } from 'uuid'
import { promisify } from 'util'

const router = express.Router()
const dbRun = promisify(db.run.bind(db))
const dbGet = promisify(db.get.bind(db))
const dbAll = promisify(db.all.bind(db))

// Get all albums
router.get('/', async (req, res) => {
  try {
    const albums = await dbAll(`
      SELECT 
        a.*,
        COUNT(DISTINCT s.id) as song_count,
        COUNT(DISTINCT sub.id) as subscriber_count,
        COUNT(DISTINCT l.id) as like_count
      FROM albums a
      LEFT JOIN songs s ON s.album_id = a.id
      LEFT JOIN subscriptions sub ON sub.artist_id = a.artist_id
      LEFT JOIN likes l ON l.song_id = s.id
      GROUP BY a.id
      ORDER BY a.created_at DESC
    `)

    res.json(albums)
  } catch (error) {
    console.error('Error fetching albums:', error)
    res.status(500).json({ error: 'Failed to fetch albums' })
  }
})

// Get album by ID
router.get('/:id', async (req, res) => {
  try {
    const album = await dbGet('SELECT * FROM albums WHERE id = ?', [req.params.id])
    
    if (!album) {
      return res.status(404).json({ error: 'Album not found' })
    }

    // Get songs for this album
    const songs = await dbAll('SELECT * FROM songs WHERE album_id = ?', [req.params.id])
    
    res.json({ ...album, songs: songs.map(s => s.id) })
  } catch (error) {
    console.error('Error fetching album:', error)
    res.status(500).json({ error: 'Failed to fetch album' })
  }
})

// Get albums by artist
router.get('/artist/:artistId', async (req, res) => {
  try {
    const albums = await dbAll(`
      SELECT 
        a.*,
        COUNT(DISTINCT s.id) as song_count
      FROM albums a
      LEFT JOIN songs s ON s.album_id = a.id
      WHERE a.artist_id = ?
      GROUP BY a.id
      ORDER BY a.created_at DESC
    `, [req.params.artistId])

    res.json(albums)
  } catch (error) {
    console.error('Error fetching artist albums:', error)
    res.status(500).json({ error: 'Failed to fetch artist albums' })
  }
})

// Create album
router.post('/', async (req, res) => {
  try {
    const { title, artist, artistId, description, coverImage } = req.body

    if (!title || !artist || !artistId) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const albumId = uuidv4()
    await dbRun(
      `INSERT INTO albums (id, title, artist, artist_id, description, cover_image)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [albumId, title, artist, artistId, description || null, coverImage || null]
    )

    const album = await dbGet('SELECT * FROM albums WHERE id = ?', [albumId])
    res.status(201).json(album)
  } catch (error) {
    console.error('Error creating album:', error)
    res.status(500).json({ error: 'Failed to create album' })
  }
})

// Update album
router.put('/:id', async (req, res) => {
  try {
    const { title, description, coverImage } = req.body

    await dbRun(
      `UPDATE albums 
       SET title = COALESCE(?, title),
           description = COALESCE(?, description),
           cover_image = COALESCE(?, cover_image),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [title, description, coverImage, req.params.id]
    )

    const album = await dbGet('SELECT * FROM albums WHERE id = ?', [req.params.id])
    res.json(album)
  } catch (error) {
    console.error('Error updating album:', error)
    res.status(500).json({ error: 'Failed to update album' })
  }
})

// Delete album
router.delete('/:id', async (req, res) => {
  try {
    await dbRun('DELETE FROM albums WHERE id = ?', [req.params.id])
    res.status(204).send()
  } catch (error) {
    console.error('Error deleting album:', error)
    res.status(500).json({ error: 'Failed to delete album' })
  }
})

export default router

