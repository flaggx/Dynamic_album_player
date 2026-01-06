import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import toast from 'react-hot-toast'
import { albumsApi, songsApi, subscriptionsApi, likesApi, favoritesApi } from '../services/api'
import { Album, Song } from '../types'
import { usePlayer } from '../contexts/PlayerContext'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'
import LoadingSpinner from '../components/LoadingSpinner'
import './AlbumDetail.css'

// Like button component
const LikeButton = ({ songId, userId, onToggle }: { songId: string; userId: string | undefined; onToggle: (id: string) => void }) => {
  const { isAuthenticated, loginWithRedirect } = useAuth0()
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)

  useEffect(() => {
    // Always load count, but only load user's like status if authenticated
    const loadData = async () => {
      try {
        const count = await likesApi.getCount(songId)
        setLikeCount(count)
        
        if (userId && isAuthenticated) {
          const liked = await likesApi.check(userId, songId)
          setIsLiked(liked)
        }
      } catch (error) {
        console.error('Error loading like status:', error)
      }
    }
    loadData()
  }, [userId, songId, isAuthenticated])

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isAuthenticated) {
      loginWithRedirect({
        appState: {
          returnTo: window.location.pathname,
        },
      })
      return
    }
    onToggle(songId)
    setIsLiked(!isLiked)
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1)
  }

  return (
    <button
      onClick={handleClick}
      className={`action-button ${isLiked ? 'liked' : ''}`}
      title={!isAuthenticated ? 'Log in to like songs' : ''}
    >
      ❤️ {likeCount}
    </button>
  )
}

// Favorite button component
const FavoriteButton = ({ songId, userId, onToggle }: { songId: string; userId: string | undefined; onToggle: (id: string) => void }) => {
  const { isAuthenticated, loginWithRedirect } = useAuth0()
  const [isFavorited, setIsFavorited] = useState(false)
  const [favoriteCount, setFavoriteCount] = useState(0)

  useEffect(() => {
    // Always load count, but only load user's favorite status if authenticated
    const loadData = async () => {
      try {
        const count = await favoritesApi.getCount(songId)
        setFavoriteCount(count)
        
        if (userId && isAuthenticated) {
          const favorited = await favoritesApi.check(userId, songId)
          setIsFavorited(favorited)
        }
      } catch (error) {
        console.error('Error loading favorite status:', error)
      }
    }
    loadData()
  }, [userId, songId, isAuthenticated])

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isAuthenticated) {
      loginWithRedirect({
        appState: {
          returnTo: window.location.pathname,
        },
      })
      return
    }
    onToggle(songId)
    setIsFavorited(!isFavorited)
    setFavoriteCount(prev => isFavorited ? prev - 1 : prev + 1)
  }

  return (
    <button
      onClick={handleClick}
      className={`action-button ${isFavorited ? 'favorited' : ''}`}
      title={!isAuthenticated ? 'Log in to favorite songs' : ''}
    >
      ⭐ {favoriteCount}
    </button>
  )
}

const AlbumDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, isAuthenticated, loginWithRedirect } = useAuth0()
  const { setCurrentSong } = usePlayer()
  
  const [album, setAlbum] = useState<Album | null>(null)
  const [songs, setSongs] = useState<Song[]>([])
  const [selectedSong, setSelectedSong] = useState<Song | null>(null)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    
    const loadAlbum = async () => {
      setIsLoading(true)
      try {
        const loadedAlbum = await albumsApi.getById(id)
        setAlbum(loadedAlbum)
        
        // Load songs for this album
        const loadedSongs = await songsApi.getByAlbum(id)
        setSongs(loadedSongs)
        
        // Set first song as selected if available
        if (loadedSongs.length > 0) {
          setSelectedSong(loadedSongs[0])
        }
      } catch (error) {
        console.error('Error loading album:', error)
        toast.error('Failed to load album')
        navigate('/discover')
      } finally {
        setIsLoading(false)
      }
    }
    
    loadAlbum()
  }, [id, navigate])

  const handleSubscribe = async () => {
    if (!isAuthenticated) {
      loginWithRedirect({
        appState: {
          returnTo: window.location.pathname,
        },
      })
      return
    }
    if (!user?.sub || !album) return
    try {
      await subscriptionsApi.subscribe(user.sub, album.artistId)
      setIsSubscribed(true)
      toast.success('Subscribed!')
      if (album) {
        setAlbum({ ...album, subscribers: album.subscribers + 1 })
      }
    } catch (error) {
      console.error('Error subscribing:', error)
      toast.error('Failed to subscribe')
    }
  }

  const handleUnsubscribe = async () => {
    if (!user?.sub || !album) return
    try {
      await subscriptionsApi.unsubscribe(user.sub, album.artistId)
      setIsSubscribed(false)
      toast.success('Unsubscribed')
      if (album) {
        setAlbum({ ...album, subscribers: Math.max(0, album.subscribers - 1) })
      }
    } catch (error) {
      console.error('Error unsubscribing:', error)
      toast.error('Failed to unsubscribe')
    }
  }

  const handleLike = async (songId: string) => {
    if (!user?.sub) return
    try {
      await likesApi.toggle(user.sub, songId)
      loadSongs()
    } catch (error) {
      console.error('Error toggling like:', error)
      toast.error('Failed to toggle like')
    }
  }

  const handleFavorite = async (songId: string) => {
    if (!user?.sub) return
    try {
      await favoritesApi.toggle(user.sub, songId)
      loadSongs()
    } catch (error) {
      console.error('Error toggling favorite:', error)
      toast.error('Failed to toggle favorite')
    }
  }

  const loadSongs = async () => {
    if (!id) return
    try {
      const loadedSongs = await songsApi.getByAlbum(id)
      setSongs(loadedSongs)
    } catch (error) {
      console.error('Error loading songs:', error)
    }
  }

  useEffect(() => {
    if (!user?.sub || !album) return
    
    const checkSubscription = async () => {
      try {
        const subscribed = await subscriptionsApi.check(user.sub || '', album.artistId)
        setIsSubscribed(subscribed)
      } catch (error) {
        console.error('Error checking subscription:', error)
      }
    }
    
    checkSubscription()
  }, [user, album])

  if (isLoading || !album) {
    return (
      <div className="spotify-app">
        <Sidebar />
        <div className="main-content">
          <TopBar />
          <div className="content-area">
            <LoadingSpinner fullScreen />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="spotify-app">
      <Sidebar />
      <div className="main-content">
        <TopBar />

        <div className="content-area">
          <div className="album-detail-container">
        <div className="album-header">
          <div className="album-cover-large">
            {album.coverImage ? (
              <img src={album.coverImage} alt={album.title} />
            ) : (
              <div className="album-placeholder-large">
                <span>🎵</span>
              </div>
            )}
          </div>
          <div className="album-info-large">
            <h1>{album.title}</h1>
            <p className="artist-name">{album.artist}</p>
            {album.description && <p className="album-description">{album.description}</p>}
            <div className="album-stats-large">
              <span>❤️ {album.likes}</span>
              <span>👥 {album.subscribers} subscribers</span>
              <span>🎵 {songs.length} songs</span>
            </div>
            <div className="album-actions-large">
              {album.artistId !== user?.sub && (
                <button
                  onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
                  className={`subscribe-button-large ${isSubscribed ? 'subscribed' : ''}`}
                >
                  {isSubscribed ? '✓ Subscribed' : '+ Subscribe'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="songs-section">
          <h2>Songs</h2>
          {songs.length === 0 ? (
            <p>No songs in this album yet.</p>
          ) : (
            <div className="songs-list">
              {songs.map(song => (
                <div
                  key={song.id}
                  className={`song-item ${selectedSong?.id === song.id ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedSong(song)
                    setCurrentSong(song)
                  }}
                >
                  <div className="song-info">
                    <h3>{song.title}</h3>
                    <p>{song.artist}</p>
                    <div className="song-tracks-info">
                      {song.tracks.length} track{song.tracks.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="song-actions">
                    <LikeButton songId={song.id} userId={user?.sub} onToggle={handleLike} />
                    <FavoriteButton songId={song.id} userId={user?.sub} onToggle={handleFavorite} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedSong && (
          <div className="player-section">
            <h2>Now Playing: {selectedSong.title}</h2>
            <p style={{ color: '#666', marginTop: '0.5rem' }}>
              Use the player at the bottom of the screen to control playback
            </p>
          </div>
        )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AlbumDetail

