import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import toast from 'react-hot-toast'
import { albumsApi, subscriptionsApi } from '../services/api'
import { Album } from '../types'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'
import LoadingSpinner from '../components/LoadingSpinner'
import './Profile.css'

const Profile = () => {
  const { user: currentUser } = useAuth0()
  const { userId } = useParams<{ userId?: string }>()
  const [userAlbums, setUserAlbums] = useState<Album[]>([])
  const [subscribers, setSubscribers] = useState(0)
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const targetUserId = userId || currentUser?.sub
    if (!targetUserId) return

    setIsOwnProfile(targetUserId === currentUser?.sub)

    const loadProfile = async () => {
      setIsLoading(true)
      try {
        // Load user's albums
        const albums = await albumsApi.getByArtist(targetUserId)
        setUserAlbums(albums)

        // Count subscribers
        const subscriberCount = await subscriptionsApi.getSubscriberCount(targetUserId)
        setSubscribers(subscriberCount)

        if (currentUser?.sub && targetUserId !== currentUser.sub) {
          const subscribed = await subscriptionsApi.check(currentUser.sub, targetUserId)
          setIsSubscribed(subscribed)
        }
      } catch (error) {
        console.error('Error loading profile:', error)
        toast.error('Failed to load profile')
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [userId, currentUser])

  const handleSubscribe = async () => {
    if (!currentUser?.sub || !userId) return
    try {
      await subscriptionsApi.subscribe(currentUser.sub, userId)
      setIsSubscribed(true)
      setSubscribers(prev => prev + 1)
      toast.success('Subscribed!')
    } catch (error) {
      console.error('Error subscribing:', error)
      toast.error('Failed to subscribe')
    }
  }

  const handleUnsubscribe = async () => {
    if (!currentUser?.sub || !userId) return
    try {
      await subscriptionsApi.unsubscribe(currentUser.sub, userId)
      setIsSubscribed(false)
      setSubscribers(prev => Math.max(0, prev - 1))
      toast.success('Unsubscribed')
    } catch (error) {
      console.error('Error unsubscribing:', error)
      toast.error('Failed to unsubscribe')
    }
  }

  const user = userId ? { sub: userId } : currentUser
  
  // Helper function to get display name with fallbacks (same logic as ProfileDropdown)
  const getDisplayName = (user: any): string => {
    if (user?.name) return user.name
    if ((user as any)?.nickname) return (user as any).nickname
    if ((user as any)?.given_name && (user as any)?.family_name) {
      return `${(user as any).given_name} ${(user as any).family_name}`
    }
    if ((user as any)?.given_name) return (user as any).given_name
    if (user?.email) {
      // Extract name from email (part before @)
      const emailName = user.email.split('@')[0]
      // Capitalize first letter
      return emailName.charAt(0).toUpperCase() + emailName.slice(1)
    }
    return 'User'
  }
  
  const displayName = getDisplayName(currentUser)
  const displayEmail = currentUser?.email || ''

  return (
    <div className="spotify-app">
      <Sidebar />
      <div className="main-content">
        <TopBar />

        <div className="content-area">
          <div className="profile-container">
        <div className="profile-header">
          <div className="profile-avatar-large">
            {currentUser?.picture && !imageError ? (
              <img 
                src={currentUser.picture} 
                alt={displayName}
                onError={() => setImageError(true)}
              />
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
      </div>
    </div>
  )
}

export default Profile

