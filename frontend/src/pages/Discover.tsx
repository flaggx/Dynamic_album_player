import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { albumsApi, subscriptionsApi } from '../services/api'
import { Album } from '../types'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'
import './Discover.css'

const Discover = () => {
  const { user } = useAuth0()
  const [albums, setAlbums] = useState<Album[]>([])
  const [filter, setFilter] = useState<'all' | 'subscribed'>('all')
  const [subscriptionStatus, setSubscriptionStatus] = useState<Map<string, boolean>>(new Map())

  useEffect(() => {
    loadAlbums()
  }, [filter, user])

  const loadAlbums = async () => {
    try {
      let allAlbums = await albumsApi.getAll()
      
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
              const subscribed = await subscriptionsApi.check(user.sub, album.artistId)
              statusMap.set(album.artistId, subscribed)
            }
          })
        )
        setSubscriptionStatus(statusMap)
      }
    } catch (error) {
      console.error('Error loading albums:', error)
    }
  }

  const handleSubscribe = async (artistId: string) => {
    if (!user?.sub) return
    try {
      await subscriptionsApi.subscribe(user.sub, artistId)
      setSubscriptionStatus(prev => new Map(prev).set(artistId, true))
      loadAlbums()
    } catch (error) {
      console.error('Error subscribing:', error)
    }
  }

  const handleUnsubscribe = async (artistId: string) => {
    if (!user?.sub) return
    try {
      await subscriptionsApi.unsubscribe(user.sub, artistId)
      setSubscriptionStatus(prev => new Map(prev).set(artistId, false))
      loadAlbums()
    } catch (error) {
      console.error('Error unsubscribing:', error)
    }
  }

  return (
    <div className="spotify-app">
      <Sidebar />
      <div className="main-content">
        <TopBar />

        <div className="content-area">
          <div className="discover-header">
            <h1>Search</h1>
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

          {albums.length === 0 ? (
            <div className="empty-state">
              <p>No albums found. Be the first to create one!</p>
              <Link to="/create-album" className="spotify-button">
                Create Album
              </Link>
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
  )
}

export default Discover

