import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { albumStorage, subscriptionStorage, likeStorage, favoriteStorage } from '../services/storage'
import { Album } from '../types'
import ProfileDropdown from '../components/ProfileDropdown'
import './Discover.css'

const Discover = () => {
  const { user } = useAuth0()
  const [albums, setAlbums] = useState<Album[]>([])
  const [filter, setFilter] = useState<'all' | 'subscribed'>('all')

  useEffect(() => {
    loadAlbums()
  }, [filter, user])

  const loadAlbums = () => {
    let allAlbums = albumStorage.getAll()
    
    if (filter === 'subscribed' && user?.sub) {
      const subscriptions = subscriptionStorage.getSubscriptions(user.sub)
      const subscribedArtistIds = subscriptions.map(sub => sub.artistId)
      allAlbums = allAlbums.filter(album => subscribedArtistIds.includes(album.artistId))
    }
    
    // Sort by creation date (newest first)
    allAlbums.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    setAlbums(allAlbums)
  }

  const handleSubscribe = (artistId: string) => {
    if (!user?.sub) return
    subscriptionStorage.subscribe(user.sub, artistId)
    loadAlbums()
  }

  const handleUnsubscribe = (artistId: string) => {
    if (!user?.sub) return
    subscriptionStorage.unsubscribe(user.sub, artistId)
    loadAlbums()
  }

  const isSubscribed = (artistId: string) => {
    if (!user?.sub) return false
    return subscriptionStorage.isSubscribed(user.sub, artistId)
  }

  return (
    <div className="discover">
      <div className="discover-container">
        <div className="discover-header">
          <h1>Discover Albums</h1>
          <div className="discover-header-right">
            {user && <ProfileDropdown user={user} />}
            <div className="filter-buttons">
            <button
              className={filter === 'all' ? 'active' : ''}
              onClick={() => setFilter('all')}
            >
              All Albums
            </button>
            <button
              className={filter === 'subscribed' ? 'active' : ''}
              onClick={() => setFilter('subscribed')}
            >
              Subscriptions
            </button>
          </div>
          </div>
        </div>

        {albums.length === 0 ? (
          <div className="empty-state">
            <p>No albums found. Be the first to create one!</p>
            <Link to="/create-album" className="create-link">
              Create Album
            </Link>
          </div>
        ) : (
          <div className="albums-grid">
            {albums.map(album => (
              <div key={album.id} className="album-card">
                <Link to={`/album/${album.id}`} className="album-link">
                  <div className="album-cover">
                    {album.coverImage ? (
                      <img src={album.coverImage} alt={album.title} />
                    ) : (
                      <div className="album-placeholder">
                        <span>🎵</span>
                      </div>
                    )}
                  </div>
                  <div className="album-info">
                    <h3>{album.title}</h3>
                    <p className="album-artist">{album.artist}</p>
                    <p className="album-songs">{album.songs.length} song{album.songs.length !== 1 ? 's' : ''}</p>
                  </div>
                </Link>
                <div className="album-actions">
                  {album.artistId !== user?.sub && (
                    <button
                      onClick={() => isSubscribed(album.artistId) 
                        ? handleUnsubscribe(album.artistId)
                        : handleSubscribe(album.artistId)
                      }
                      className={`subscribe-button ${isSubscribed(album.artistId) ? 'subscribed' : ''}`}
                    >
                      {isSubscribed(album.artistId) ? '✓ Subscribed' : '+ Subscribe'}
                    </button>
                  )}
                  <div className="album-stats">
                    <span>❤️ {album.likes}</span>
                    <span>👥 {album.subscribers}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Discover

