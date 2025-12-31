import { beforeAll, afterAll, beforeEach } from 'vitest'
import { initDatabase, db } from '../database/init'
import fs from 'fs'
import path from 'path'

const TEST_DB_PATH = path.join(process.cwd(), 'test-db.sqlite')

beforeAll(async () => {
  // Use test database
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH)
  }
  process.env.DATABASE_PATH = TEST_DB_PATH
  await initDatabase()
})

afterAll(async () => {
  // Close database connection
  return new Promise<void>((resolve) => {
    db.close((err) => {
      if (err) console.error('Error closing database:', err)
      // Clean up test database file
      if (fs.existsSync(TEST_DB_PATH)) {
        fs.unlinkSync(TEST_DB_PATH)
      }
      resolve()
    })
  })
})

beforeEach(async () => {
  // Clear all tables before each test (in correct order to respect foreign keys)
  return new Promise<void>((resolve, reject) => {
    db.serialize(() => {
      db.run('DELETE FROM favorites', (err) => { if (err) console.error('Error deleting favorites:', err) })
      db.run('DELETE FROM likes', (err) => { if (err) console.error('Error deleting likes:', err) })
      db.run('DELETE FROM subscriptions', (err) => { if (err) console.error('Error deleting subscriptions:', err) })
      db.run('DELETE FROM tracks', (err) => { if (err) console.error('Error deleting tracks:', err) })
      db.run('DELETE FROM songs', (err) => { if (err) console.error('Error deleting songs:', err) })
      db.run('DELETE FROM albums', (err) => { if (err) console.error('Error deleting albums:', err) })
      db.run('DELETE FROM users', (err) => {
        if (err) {
          console.error('Error deleting users:', err)
          reject(err)
        } else {
          resolve()
        }
      })
    })
  })
})

