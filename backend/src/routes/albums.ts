import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { db } from '../database/init.js'
import { v4 as uuidv4 } from 'uuid'
import { promisify } from 'util'
import { authenticate, optionalAuth, getUserId, AuthRequest } from '../middleware/auth.js'
import { CustomError } from '../middleware/errorHandler'

const router = express.Router()
const dbRun = promisify(db.run.bind(db)) as (sql: string, params?: any[]) => Promise<any>
const dbGet = promisify(db.get.bind(db)) as (sql: string, params?: any[]) => Promise<any>
const dbAll = promisify(db.all.bind(db)) as (sql: string, params?: any[]) => Promise<any[]>

// Configure multer for cover image uploads
const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const coverImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `cover-${Date.now()}-${Math.round(Math.random() * 1E9)}`
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`)
  }
})

const uploadCoverImage = multer({
  storage: coverImageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB for images
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /image\/(jpeg|jpg|png|gif|webp)/
    if (allowedTypes.test(file.mimetype) || /\.(jpeg|jpg|png|gif|webp)$/i.test(file.originalname)) {
      cb(null, true)
    } else {
      cb(new CustomError('Invalid file type. Only image files are allowed.', 400))
    }
  }
})

// Get all albums (public, but can use optional auth for personalized results)
// Supports search query parameter
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    // Test database connection first
    try {
      await dbGet('SELECT 1')
    } catch (dbError: any) {
      console.error('Database connection test failed:', dbError)
      return res.status(503).json({ error: 'Database unavailable', details: dbError.message })
    }

    const { search } = req.query
    
    // First, get basic album data
    let baseQuery = `SELECT * FROM albums`
    const params: any[] = []
    
    if (search && typeof search === 'string') {
      baseQuery += ` WHERE LOWER(title) LIKE LOWER(?) OR LOWER(artist) LIKE LOWER(?) OR LOWER(description) LIKE LOWER(?)`
      const searchTerm = `%${search}%`
      params.push(searchTerm, searchTerm, searchTerm)
    }
    
    baseQuery += ` ORDER BY created_at DESC`
    
    console.log('Executing albums query:', baseQuery, 'with params:', params)
    const albums = await dbAll(baseQuery, params)
    console.log('Albums query returned', albums?.length || 0, 'albums')
    
    // If no albums, return empty array
    if (!albums || albums.length === 0) {
      return res.json([])
    }
    
    // Then add counts for each album
    const albumsWithCounts = await Promise.all(
      albums.map(async (album: any) => {
        try {
          const [songCountResult, subscriberCountResult] = await Promise.all([
            dbGet('SELECT COUNT(*) as count FROM songs WHERE album_id = ?', [album.id]).catch(() => ({ count: 0 })),
            dbGet('SELECT COUNT(*) as count FROM subscriptions WHERE artist_id = ?', [album.artist_id]).catch(() => ({ count: 0 }))
          ])
          
          // Get like count separately
          let likeCount = 0
          try {
            const likeCountResult = await dbGet(
              `SELECT COUNT(DISTINCT l.id) as count 
               FROM likes l 
               INNER JOIN songs s ON s.id = l.song_id 
               WHERE s.album_id = ?`,
              [album.id]
            )
            likeCount = (likeCountResult as any)?.count || 0
          } catch (err) {
            console.warn(`Error getting like count for album ${album.id}:`, err)
          }
          
          return {
            ...album,
            song_count: (songCountResult as any)?.count || 0,
            subscriber_count: (subscriberCountResult as any)?.count || 0,
            like_count: likeCount
          }
        } catch (err) {
          console.error(`Error getting counts for album ${album.id}:`, err)
          // Return album without counts if there's an error
          return {
            ...album,
            song_count: 0,
            subscriber_count: 0,
            like_count: 0
          }
        }
      })
    )

    res.json(albumsWithCounts)
  } catch (error: any) {
    console.error('Error in GET /api/albums:', error)
    console.error('Error message:', error.message)
    console.error('Error code:', (error as any).code)
    console.error('Error name:', error.name)
    console.error('Error stack:', error.stack)
    
    // If there's a database error, return empty array instead of 500
    if ((error as any).code === 'SQLITE_ERROR' || 
        (error as any).code === 'SQLITE_BUSY' ||
        error.message?.includes('SQLITE') ||
        error.message?.includes('no such table')) {
      console.warn('Database error, returning empty array')
      return res.json([])
    }
    
    next(error)
  }
})

// Get album by ID
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const album = await dbGet('SELECT * FROM albums WHERE id = ?', [req.params.id]) as any
    
    if (!album) {
      throw new CustomError('Album not found', 404)
    }

    // Get songs for this album
    const songs = await dbAll('SELECT * FROM songs WHERE album_id = ?', [req.params.id]) as any[]
    
    res.json({ ...album, songs: songs.map((s: any) => s.id) })
  } catch (error) {
    next(error)
  }
})

// Get albums by artist
router.get('/artist/:artistId', optionalAuth, async (req, res, next) => {
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
    next(error)
  }
})

// Create album (requires authentication, supports cover image upload)
router.post('/', authenticate, uploadCoverImage.single('coverImage'), async (req: AuthRequest, res, next) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      throw new CustomError('Unauthorized', 401)
    }

    const { title, artist, description } = req.body
    const coverImageFile = req.file

    if (!title || !artist) {
      throw new CustomError('Missing required fields', 400)
    }

    // Use authenticated user's ID as artistId
    const albumId = uuidv4()
    const coverImagePath = coverImageFile ? `/uploads/${coverImageFile.filename}` : null

    await dbRun(
      `INSERT INTO albums (id, title, artist, artist_id, description, cover_image)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [albumId, title, artist, userId, description || null, coverImagePath]
    )

    const album = await dbGet('SELECT * FROM albums WHERE id = ?', [albumId])
    res.status(201).json(album)
  } catch (error) {
    next(error)
  }
})

// Update album (requires authentication and ownership, supports cover image upload)
router.put('/:id', authenticate, uploadCoverImage.single('coverImage'), async (req: AuthRequest, res, next) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      throw new CustomError('Unauthorized', 401)
    }

    // Check if album exists and user owns it
    const album = await dbGet('SELECT * FROM albums WHERE id = ?', [req.params.id]) as any
    if (!album) {
      throw new CustomError('Album not found', 404)
    }
    if (album.artist_id !== userId) {
      throw new CustomError('Forbidden: You can only edit your own albums', 403)
    }

    const { title, description } = req.body
    const coverImageFile = req.file

    // Delete old cover image if new one is uploaded
    if (coverImageFile && album.cover_image) {
      const oldImagePath = path.join(process.cwd(), album.cover_image.replace(/^\//, ''))
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath)
      }
    }

    const coverImagePath = coverImageFile ? `/uploads/${coverImageFile.filename}` : album.cover_image

    await dbRun(
      `UPDATE albums 
       SET title = COALESCE(?, title),
           description = COALESCE(?, description),
           cover_image = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [title, description, coverImagePath, req.params.id]
    )

    const updated = await dbGet('SELECT * FROM albums WHERE id = ?', [req.params.id])
    res.json(updated)
  } catch (error) {
    next(error)
  }
})

// Delete album (requires authentication and ownership)
router.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      throw new CustomError('Unauthorized', 401)
    }

    // Check if album exists and user owns it
    const album = await dbGet('SELECT * FROM albums WHERE id = ?', [req.params.id]) as any
    if (!album) {
      throw new CustomError('Album not found', 404)
    }
    if (album.artist_id !== userId) {
      throw new CustomError('Forbidden: You can only delete your own albums', 403)
    }

    // Delete cover image if exists
    if (album.cover_image) {
      const imagePath = path.join(process.cwd(), album.cover_image.replace(/^\//, ''))
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath)
      }
    }

    await dbRun('DELETE FROM albums WHERE id = ?', [req.params.id])
    res.status(204).send()
  } catch (error) {
    next(error)
  }
})

export default router

