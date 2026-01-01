import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import toast from 'react-hot-toast'
import { albumsApi, subscriptionsApi } from '../services/api'
import { Album } from '../types'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'
import LoadingSpinner from '../components/LoadingSpinner'
import './Discover.css'

const Discover = () => {
  const { user } = useAuth0()
  const [searchParams] = useSearchParams()
  const [albums, setAlbums] = useState<Album[]>([])
  const [filter, setFilter] = useState<'all' | 'subscribed'>('all')
  const [subscriptionStatus, setSubscriptionStatus] = useState<Map<string, boolean>>(new Map())
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [isLoading, setIsLoading] = useState(true)

  // Update search query from URL params
  useEffect(() => {
    const urlSearch = searchParams.get('search') || ''
    setSearchQuery(urlSearch)
  }, [searchParams])

  useEffect(() => {
    loadAlbums()
  }, [filter, user, searchQuery])

  const loadAlbums = async () => {
    setIsLoading(true)
    try {
      // Use backend search if query exists, otherwise get all
      const searchTerm = searchQuery.trim() || undefined
      let allAlbums = await albumsApi.getAll(searchTerm)
      
      if (filter === 'subscribed' && user?.sub) {
        const subscriptions = await subscriptionsApi.getUserSubscriptions(user.sub)
        const subscribedArtistIds = subscriptions.map(sub => sub.artistId)
        allAlbums = allAlbums.filter(album => subscribedArtistIds.includes(album.artistId))
      }
      
      // Sort by creation date (newest first)
      allAlbums.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setAlbums(allAlbums)

      // Load subscription status for all albums
      if (user?.sub) {
        const statusMap = new Map<string, boolean>()
        await Promise.all(
          allAlbums.map(async (album) => {
            if (album.artistId !== user.sub) {
              const subscribed = await subscriptionsApi.check(user.sub || '', album.artistId)
              statusMap.set(album.artistId, subscribed)
            }
          })
        )
        setSubscriptionStatus(statusMap)
      }
    } catch (error) {
      console.error('Error loading albums:', error)
      toast.error('Failed to load albums')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubscribe = async (artistId: string) => {
    if (!user?.sub) return
    try {
      await subscriptionsApi.subscribe(user.sub, artistId)
      setSubscriptionStatus(prev => new Map(prev).set(artistId, true))
      toast.success('Subscribed!')
      loadAlbums()
    } catch (error) {
      console.error('Error subscribing:', error)
      toast.error('Failed to subscribe')
    }
  }

  const handleUnsubscribe = async (artistId: string) => {
    if (!user?.sub) return
    try {
      await subscriptionsApi.unsubscribe(user.sub, artistId)
      setSubscriptionStatus(prev => new Map(prev).set(artistId, false))
      toast.success('Unsubscribed')
      loadAlbums()
    } catch (error) {
      console.error('Error unsubscribing:', error)
      toast.error('Failed to unsubscribe')
    }
  }

  return (
    <div className="spotify-app">
      <Sidebar />
      <div className="main-content">
        <TopBar />

        <div className="content-area">
          <div className="discover-container">
            <div className="discover-header">
              <h1>Discover</h1>
              <div className="filter-buttons">
                <button
                  className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                  onClick={() => setFilter('all')}
                >
                  All
                </button>
                <button
                  className={`filter-btn ${filter === 'subscribed' ? 'active' : ''}`}
                  onClick={() => setFilter('subscribed')}
                >
                  Your Artists
                </button>
              </div>
            </div>
            <div className="search-container" style={{ marginBottom: '2rem' }}>
              <input
                type="text"
                placeholder="Search albums, artists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  fontSize: '1rem',
                  background: '#2a2a2a',
                  border: '1px solid #404040',
                  borderRadius: '4px',
                  color: '#fff',
                }}
              />
            </div>

            {isLoading ? (
              <LoadingSpinner fullScreen />
            ) : albums.length === 0 ? (
              <div className="empty-state">
                <p>{searchQuery ? 'No albums found matching your search.' : 'No albums found. Be the first to create one!'}</p>
                {!searchQuery && (
                  <Link to="/create-album" className="spotify-button">
                    Create Album
                  </Link>
                )}
              </div>
            ) : (
              <div className="section">
                <div className="section-header">
                  <h2>{filter === 'all' ? 'All Albums' : 'Your Artists'}</h2>
                </div>
                <div className="albums-grid">
                  {albums.map(album => (
                    <div key={album.id} className="spotify-card">
                      <Link to={`/album/${album.id}`} className="card-link">
                        <div className="card-image-container">
                          {album.coverImage ? (
                            <img src={album.coverImage} alt={album.title} className="card-image" />
                          ) : (
                            <div className="card-image-placeholder">
                              <span>🎵</span>
                            </div>
                          )}
                          <button className="play-button-overlay">
                            ▶
                          </button>
                        </div>
                        <div className="card-info">
                          <div className="card-title">{album.title}</div>
                          <div className="card-subtitle">{album.artist}</div>
                        </div>
                      </Link>
                      {album.artistId !== user?.sub && (
                        <button
                          onClick={() => {
                            const subscribed = subscriptionStatus.get(album.artistId) || false
                            if (subscribed) {
                              handleUnsubscribe(album.artistId)
                            } else {
                              handleSubscribe(album.artistId)
                            }
                          }}
                          className={`subscribe-btn-small ${subscriptionStatus.get(album.artistId) ? 'subscribed' : ''}`}
                        >
                          {subscriptionStatus.get(album.artistId) ? '✓' : '+'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Discover

