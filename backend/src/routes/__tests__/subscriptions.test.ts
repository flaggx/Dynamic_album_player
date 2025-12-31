import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import subscriptionRoutes from '../subscriptions'
import { db } from '../../database/init'
import { promisify } from 'util'

const dbRun = promisify(db.run.bind(db))

const app = express()
app.use(express.json())
app.use('/api/subscriptions', subscriptionRoutes)

describe('Subscriptions API', () => {
  beforeEach(async () => {
    // Global beforeEach already clears data, just insert test data
    await dbRun(
      `INSERT OR IGNORE INTO users (id, email, name) VALUES (?, ?, ?)`,
      ['user1', 'user1@example.com', 'User 1']
    )
    await dbRun(
      `INSERT OR IGNORE INTO users (id, email, name) VALUES (?, ?, ?)`,
      ['artist1', 'artist1@example.com', 'Artist 1']
    )
  })

  describe('POST /api/subscriptions', () => {
    it('should create subscription', async () => {
      const response = await request(app)
        .post('/api/subscriptions')
        .send({ userId: 'user1', artistId: 'artist1' })

      expect(response.status).toBe(201)
      expect(response.body.user_id).toBe('user1')
      expect(response.body.artist_id).toBe('artist1')
    })

    it('should return 400 for missing fields', async () => {
      const response = await request(app)
        .post('/api/subscriptions')
        .send({ userId: 'user1' })

      expect(response.status).toBe(400)
    })
  })

  describe('GET /api/subscriptions/check/:userId/:artistId', () => {
    it('should return false when not subscribed', async () => {
      const response = await request(app)
        .get('/api/subscriptions/check/user1/artist1')

      expect(response.status).toBe(200)
      expect(response.body.isSubscribed).toBe(false)
    })

    it('should return true when subscribed', async () => {
      await dbRun(
        `INSERT INTO subscriptions (id, user_id, artist_id)
         VALUES (?, ?, ?)`,
        ['sub1', 'user1', 'artist1']
      )

      const response = await request(app)
        .get('/api/subscriptions/check/user1/artist1')

      expect(response.status).toBe(200)
      expect(response.body.isSubscribed).toBe(true)
    })
  })

  describe('DELETE /api/subscriptions/:userId/:artistId', () => {
    it('should unsubscribe', async () => {
      await dbRun(
        `INSERT INTO subscriptions (id, user_id, artist_id)
         VALUES (?, ?, ?)`,
        ['sub1', 'user1', 'artist1']
      )

      const response = await request(app)
        .delete('/api/subscriptions/user1/artist1')

      expect(response.status).toBe(204)

      // Verify unsubscribed
      const checkResponse = await request(app)
        .get('/api/subscriptions/check/user1/artist1')
      expect(checkResponse.body.isSubscribed).toBe(false)
    })
  })
})

