import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { albumStorage, subscriptionStorage, likeStorage, favoriteStorage } from '../services/storage'
import { Album } from '../types'
import ProfileDropdown from '../components/ProfileDropdown'
import './Profile.css'

const Profile = () => {
  const { user: currentUser } = useAuth0()
  const { userId } = useParams<{ userId?: string }>()
  const [userAlbums, setUserAlbums] = useState<Album[]>([])
  const [subscribers, setSubscribers] = useState(0)
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)

  useEffect(() => {
    const targetUserId = userId || currentUser?.sub
    if (!targetUserId) return

    setIsOwnProfile(targetUserId === currentUser?.sub)

    // Load user's albums
    const albums = albumStorage.getByArtist(targetUserId)
    setUserAlbums(albums)

    // Count subscribers
    const allSubscriptions = subscriptionStorage.getAll()
    const userSubscribers = allSubscriptions.filter(sub => sub.artistId === targetUserId).length
    setSubscribers(userSubscribers)

    // Check if current user is subscribed
    if (currentUser?.sub && targetUserId !== currentUser.sub) {
      setIsSubscribed(subscriptionStorage.isSubscribed(currentUser.sub, targetUserId))
    }
  }, [userId, currentUser])

  const handleSubscribe = () => {
    if (!currentUser?.sub || !userId) return
    subscriptionStorage.subscribe(currentUser.sub, userId)
    setIsSubscribed(true)
    setSubscribers(prev => prev + 1)
  }

  const handleUnsubscribe = () => {
    if (!currentUser?.sub || !userId) return
    subscriptionStorage.unsubscribe(currentUser.sub, userId)
    setIsSubscribed(false)
    setSubscribers(prev => Math.max(0, prev - 1))
  }

  const user = userId ? { sub: userId } : currentUser
  const displayName = currentUser?.name || currentUser?.email || 'User'
  const displayEmail = currentUser?.email || ''

  return (
    <div className="profile-page">
      <div className="profile-header-bar">
        {currentUser && <ProfileDropdown user={currentUser} />}
      </div>
      <div className="profile-container">
        <div className="profile-header">
          <div className="profile-avatar-large">
            {currentUser?.picture ? (
              <img src={currentUser.picture} alt={displayName} />
            ) : (
              <div className="avatar-placeholder-large">
                {displayName[0]?.toUpperCase() || 'U'}
              </div>
            )}
          </div>
          <div className="profile-info">
            <h1>{displayName}</h1>
            {displayEmail && <p className="profile-email">{displayEmail}</p>}
            <div className="profile-stats">
              <div className="stat-item">
                <span className="stat-value">{userAlbums.length}</span>
                <span className="stat-label">Albums</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{subscribers}</span>
                <span className="stat-label">Subscribers</span>
              </div>
            </div>
            {!isOwnProfile && userId && (
              <button
                onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
                className={`subscribe-button-profile ${isSubscribed ? 'subscribed' : ''}`}
              >
                {isSubscribed ? '✓ Subscribed' : '+ Subscribe'}
              </button>
            )}
            {isOwnProfile && (
              <Link to="/create-album" className="create-album-button">
                + Create New Album
              </Link>
            )}
          </div>
        </div>

        <div className="profile-content">
          <h2>{isOwnProfile ? 'My Albums' : 'Albums'}</h2>
          {userAlbums.length === 0 ? (
            <div className="empty-state">
              <p>{isOwnProfile ? "You haven't created any albums yet." : 'No albums yet.'}</p>
              {isOwnProfile && (
                <Link to="/create-album" className="create-link">
                  Create Your First Album
                </Link>
              )}
            </div>
          ) : (
            <div className="albums-grid">
              {userAlbums.map(album => (
                <Link key={album.id} to={`/album/${album.id}`} className="album-card">
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
                    <p className="album-songs">{album.songs.length} song{album.songs.length !== 1 ? 's' : ''}</p>
                    <div className="album-stats">
                      <span>❤️ {album.likes}</span>
                      <span>👥 {album.subscribers}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Profile

