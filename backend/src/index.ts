import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import albumRoutes from './routes/albums'
import songRoutes from './routes/songs'
import userRoutes from './routes/users'
import subscriptionRoutes from './routes/subscriptions'
import likeRoutes from './routes/likes'
import favoriteRoutes from './routes/favorites'
import adminRoutes from './routes/admin'
import { initDatabase } from './database/init'
import { errorHandler } from './middleware/errorHandler'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Serve uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

// Routes
app.use('/api/albums', albumRoutes)
app.use('/api/songs', songRoutes)
app.use('/api/users', userRoutes)
app.use('/api/subscriptions', subscriptionRoutes)
app.use('/api/likes', likeRoutes)
app.use('/api/favorites', favoriteRoutes)
app.use('/api/admin', adminRoutes)

// Root route
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Dynamic Album Player API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      albums: '/api/albums',
      songs: '/api/songs',
      users: '/api/users',
      subscriptions: '/api/subscriptions',
      likes: '/api/likes',
      favorites: '/api/favorites',
      admin: '/api/admin'
    }
  })
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Dynamic Album Player API' })
})

// Error handling middleware (must be last)
app.use(errorHandler)

// Initialize database and start server
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`)
    console.log(`📁 Upload directory: ${path.join(process.cwd(), 'uploads')}`)
  })
}).catch((error) => {
  console.error('Failed to initialize database:', error)
  process.exit(1)
})

export default app

