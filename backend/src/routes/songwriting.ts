import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import { dbRun, dbGet, dbAll } from '../database/client.js'
import { authenticate, AuthRequest, getUserId } from '../middleware/auth.js'
import { requirePremium } from '../middleware/premium.js'
import { CustomError } from '../middleware/errorHandler.js'

const router = express.Router()

const isTruthyPublic = (v: unknown): boolean => v === true || v === 1

// GET /api/songwriting - Get all songs (user's own + public)
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      throw new CustomError('Unauthorized', 401)
    }

    const songs = await dbAll(
      `SELECT * FROM songwriting_songs 
       WHERE user_id = ? OR is_public = TRUE 
       ORDER BY updated_at DESC`,
      [userId]
    )

    res.json(songs.map(song => ({
      id: song.id,
      userId: song.user_id,
      title: song.title,
      authorFirstName: song.author_first_name || '',
      authorLastName: song.author_last_name || '',
      key: song.key,
      timeSignature: song.time_signature,
      chordProgression: song.chord_progression ? JSON.parse(String(song.chord_progression)) : null,
      structure: JSON.parse(String(song.structure)),
      isPublic: isTruthyPublic(song.is_public),
      createdAt: song.created_at,
      updatedAt: song.updated_at,
    })))
  } catch (error) {
    next(error)
  }
})

// GET /api/songwriting/:id - Get a specific song
router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      throw new CustomError('Unauthorized', 401)
    }

    const song = await dbGet(
      `SELECT * FROM songwriting_songs WHERE id = ?`,
      [req.params.id]
    )

    if (!song) {
      throw new CustomError('Song not found', 404)
    }

    if (song.user_id !== userId && !isTruthyPublic(song.is_public)) {
      throw new CustomError('Access denied', 403)
    }

    res.json({
      id: song.id,
      userId: song.user_id,
      title: song.title,
      authorFirstName: song.author_first_name || '',
      authorLastName: song.author_last_name || '',
      key: song.key,
      timeSignature: song.time_signature,
      chordProgression: song.chord_progression ? JSON.parse(String(song.chord_progression)) : null,
      structure: JSON.parse(String(song.structure)),
      isPublic: isTruthyPublic(song.is_public),
      createdAt: song.created_at,
      updatedAt: song.updated_at,
    })
  } catch (error) {
    next(error)
  }
})

// POST /api/songwriting - Create a new song
router.post('/', authenticate, requirePremium, async (req: AuthRequest, res, next) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      throw new CustomError('Unauthorized', 401)
    }

    const { title, authorFirstName, authorLastName, key, timeSignature, chordProgression, structure, isPublic } = req.body

    if (!title || !authorFirstName || !authorLastName || !key || !structure) {
      throw new CustomError('Missing required fields: title, authorFirstName, authorLastName, key, structure', 400)
    }

    const id = uuidv4()
    const now = new Date().toISOString()

    await dbRun(
      `INSERT INTO songwriting_songs 
       (id, user_id, title, author_first_name, author_last_name, "key", time_signature, chord_progression, structure, is_public, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        title,
        authorFirstName,
        authorLastName,
        key,
        timeSignature || '4/4',
        chordProgression ? JSON.stringify(chordProgression) : null,
        JSON.stringify(structure),
        Boolean(isPublic),
        now,
        now,
      ]
    )

    res.status(201).json({
      id,
      userId,
      title,
      authorFirstName,
      authorLastName,
      key,
      timeSignature: timeSignature || '4/4',
      chordProgression,
      structure,
      isPublic: isPublic || false,
      createdAt: now,
      updatedAt: now,
    })
  } catch (error) {
    next(error)
  }
})

// PUT /api/songwriting/:id - Update a song
router.put('/:id', authenticate, requirePremium, async (req: AuthRequest, res, next) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      throw new CustomError('Unauthorized', 401)
    }

    const song = await dbGet(
      `SELECT * FROM songwriting_songs WHERE id = ?`,
      [req.params.id]
    )

    if (!song) {
      throw new CustomError('Song not found', 404)
    }

    if (song.user_id !== userId) {
      throw new CustomError('Access denied', 403)
    }

    const { title, authorFirstName, authorLastName, key, timeSignature, chordProgression, structure, isPublic } = req.body
    const now = new Date().toISOString()

    await dbRun(
      `UPDATE songwriting_songs 
       SET title = ?, author_first_name = ?, author_last_name = ?, "key" = ?, time_signature = ?, chord_progression = ?, structure = ?, is_public = ?, updated_at = ?
       WHERE id = ?`,
      [
        title || song.title,
        authorFirstName || song.author_first_name,
        authorLastName || song.author_last_name,
        key || song.key,
        timeSignature || song.time_signature,
        chordProgression ? JSON.stringify(chordProgression) : song.chord_progression,
        structure ? JSON.stringify(structure) : song.structure,
        isPublic !== undefined ? Boolean(isPublic) : song.is_public,
        now,
        req.params.id,
      ]
    )

    const updated = await dbGet(
      `SELECT * FROM songwriting_songs WHERE id = ?`,
      [req.params.id]
    )
    if (!updated) {
      throw new CustomError('Song not found', 404)
    }

    res.json({
      id: updated.id,
      userId: updated.user_id,
      title: updated.title,
      authorFirstName: updated.author_first_name || '',
      authorLastName: updated.author_last_name || '',
      key: updated.key,
      timeSignature: updated.time_signature,
      chordProgression: updated.chord_progression ? JSON.parse(String(updated.chord_progression)) : null,
      structure: JSON.parse(String(updated.structure)),
      isPublic: isTruthyPublic(updated.is_public),
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    })
  } catch (error) {
    next(error)
  }
})

// DELETE /api/songwriting/:id - Delete a song
router.delete('/:id', authenticate, requirePremium, async (req: AuthRequest, res, next) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      throw new CustomError('Unauthorized', 401)
    }

    const song = await dbGet(
      `SELECT * FROM songwriting_songs WHERE id = ?`,
      [req.params.id]
    )

    if (!song) {
      throw new CustomError('Song not found', 404)
    }

    if (song.user_id !== userId) {
      throw new CustomError('Access denied', 403)
    }

    await dbRun(`DELETE FROM songwriting_songs WHERE id = ?`, [req.params.id])

    res.json({ message: 'Song deleted successfully' })
  } catch (error) {
    next(error)
  }
})

export default router
