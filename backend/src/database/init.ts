import sqlite3 from 'sqlite3'
import path from 'path'
import fs from 'fs'

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'database.sqlite')
const dbDir = path.dirname(dbPath)

// Ensure data directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

export const db = new sqlite3.Database(dbPath, (err: Error | null) => {
  if (err) {
    console.error('Error opening database:', err)
  } else {
    console.log('✅ Connected to SQLite database')
  }
})

export const initDatabase = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          name TEXT,
          picture TEXT,
          bio TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)

      // Albums table
      db.run(`
        CREATE TABLE IF NOT EXISTS albums (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          artist TEXT NOT NULL,
          artist_id TEXT NOT NULL,
          description TEXT,
          cover_image TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (artist_id) REFERENCES users(id)
        )
      `)

      // Songs table
      db.run(`
        CREATE TABLE IF NOT EXISTS songs (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          artist TEXT NOT NULL,
          album_id TEXT NOT NULL,
          duration REAL,
          cover_image TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE
        )
      `)

      // Tracks table
      db.run(`
        CREATE TABLE IF NOT EXISTS tracks (
          id TEXT PRIMARY KEY,
          song_id TEXT NOT NULL,
          name TEXT NOT NULL,
          file_path TEXT NOT NULL,
          enabled INTEGER DEFAULT 1,
          FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
        )
      `)

      // Subscriptions table
      db.run(`
        CREATE TABLE IF NOT EXISTS subscriptions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          artist_id TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (artist_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE(user_id, artist_id)
        )
      `)

      // Likes table
      db.run(`
        CREATE TABLE IF NOT EXISTS likes (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          song_id TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
          UNIQUE(user_id, song_id)
        )
      `)

      // Favorites table
      db.run(`
        CREATE TABLE IF NOT EXISTS favorites (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          song_id TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
          UNIQUE(user_id, song_id)
        )
      `)

      // Create indexes
      db.run(`CREATE INDEX IF NOT EXISTS idx_albums_artist_id ON albums(artist_id)`)
      db.run(`CREATE INDEX IF NOT EXISTS idx_songs_album_id ON songs(album_id)`)
      db.run(`CREATE INDEX IF NOT EXISTS idx_tracks_song_id ON tracks(song_id)`)
      db.run(`CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id)`)
      db.run(`CREATE INDEX IF NOT EXISTS idx_subscriptions_artist_id ON subscriptions(artist_id)`)
      db.run(`CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id)`)
      db.run(`CREATE INDEX IF NOT EXISTS idx_likes_song_id ON likes(song_id)`)
      db.run(`CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id)`)
      db.run(`CREATE INDEX IF NOT EXISTS idx_favorites_song_id ON favorites(song_id)`)

      console.log('✅ Database tables initialized')
      resolve()
    })
  })
}

