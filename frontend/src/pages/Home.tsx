import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { albumsApi } from '../services/api'
import { Album } from '../types'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'
import LoadingSpinner from '../components/LoadingSpinner'
import './Home.css'

const Home = () => {
  const [trendingAlbums, setTrendingAlbums] = useState<Album[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadTrendingAlbums = async () => {
      try {
        const allAlbums = await albumsApi.getAll()
        
        // Calculate trending score: combination of likes, subscribers, and recency
        const albumsWithScore = allAlbums.map(album => {
          const likes = album.likes || 0
          const subscribers = album.subscribers || 0
          const daysSinceCreation = (Date.now() - new Date(album.createdAt).getTime()) / (1000 * 60 * 60 * 24)
          
          // Trending score: weighted combination
          // - Likes: 3 points each
          // - Subscribers: 5 points each (more valuable)
          // - Recency bonus: albums from last 7 days get bonus points
          const recencyBonus = daysSinceCreation <= 7 ? 50 : Math.max(0, 50 - daysSinceCreation)
          const trendingScore = (likes * 3) + (subscribers * 5) + recencyBonus
          
          return { ...album, trendingScore }
        })
        
        // Sort by trending score (highest first) and take top 12
        const sorted = albumsWithScore
          .sort((a, b) => (b as any).trendingScore - (a as any).trendingScore)
          .slice(0, 12)
        
        setTrendingAlbums(sorted)
      } catch (error) {
        console.error('Error loading trending albums:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadTrendingAlbums()
  }, [])

  return (
    <div className="spotify-app">
      <Sidebar />
      <div className="main-content">
        <TopBar />

        <div className="content-area">
          <div className="greeting-section">
            <h1>Good evening</h1>
            <div className="quick-access-grid">
              <Link to="/discover" className="quick-access-card">
                <div className="card-icon search-icon"></div>
                <span>Search</span>
              </Link>
              <Link to="/create-album" className="quick-access-card">
                <div className="card-icon plus-icon"></div>
                <span>Create Album</span>
              </Link>
              <Link to="/my-albums" className="quick-access-card">
                <div className="card-icon library-icon"></div>
                <span>Your Library</span>
              </Link>
              <Link to="/my-favorites" className="quick-access-card">
                <div className="card-icon heart-icon"></div>
                <span>Liked Songs</span>
              </Link>
            </div>
          </div>

          {isLoading ? (
            <LoadingSpinner />
          ) : (
            <>
              <div className="section">
                <div className="section-header">
                  <h2>Trending Now</h2>
                  <Link to="/discover" className="see-all-link">Show all</Link>
                </div>
                {trendingAlbums.length > 0 ? (
                  <div className="cards-grid">
                    {trendingAlbums.map(album => (
                      <Link key={album.id} to={`/album/${album.id}`} className="feature-card">
                        <div className="feature-card-image">
                          {album.coverImage ? (
                            <img src={album.coverImage} alt={album.title} />
                          ) : (
                            <span className="feature-icon search-icon"></span>
                          )}
                        </div>
                        <div className="feature-card-title">{album.title}</div>
                        <div className="feature-card-subtitle">{album.artist}</div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state" style={{ padding: '2rem', textAlign: 'center', color: 'var(--spotify-light-gray)' }}>
                    <p>No trending albums yet. Be the first to create one!</p>
                    <Link to="/create-album" className="see-all-link" style={{ marginTop: '1rem', display: 'inline-block' }}>
                      Create Album
                    </Link>
                  </div>
                )}
              </div>

              <div className="section">
                <div className="section-header">
                  <h2>Made for You</h2>
                  <Link to="/discover" className="see-all-link">Show all</Link>
                </div>
                <div className="cards-grid">
                  <Link to="/discover" className="feature-card">
                    <div className="feature-card-image">
                      <span className="feature-icon search-icon"></span>
                    </div>
                    <div className="feature-card-title">Discover</div>
                    <div className="feature-card-subtitle">Explore new albums</div>
                  </Link>
                  <Link to="/create-album" className="feature-card">
                    <div className="feature-card-image">
                      <span className="feature-icon plus-icon"></span>
                    </div>
                    <div className="feature-card-title">Create</div>
                    <div className="feature-card-subtitle">Upload your music</div>
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default Home

