import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { albumStorage, songStorage, subscriptionStorage, likeStorage, favoriteStorage } from '../services/storage'
import { Album, Song } from '../types'
import { usePlayer } from '../contexts/PlayerContext'
import Sidebar from '../components/Sidebar'
import ProfileDropdown from '../components/ProfileDropdown'
import './AlbumDetail.css'

const AlbumDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth0()
  const { setCurrentSong } = usePlayer()
  
  const [album, setAlbum] = useState<Album | null>(null)
  const [songs, setSongs] = useState<Song[]>([])
  const [selectedSong, setSelectedSong] = useState<Song | null>(null)

  useEffect(() => {
    if (!id) return
    
    const loadedAlbum = albumStorage.getById(id)
    if (!loadedAlbum) {
      navigate('/discover')
      return
    }
    
    setAlbum(loadedAlbum)
    
    // Load songs for this album
    const loadedSongs = songStorage.getByAlbum(id)
    setSongs(loadedSongs)
    
    // Set first song as selected if available
    if (loadedSongs.length > 0) {
      setSelectedSong(loadedSongs[0])
    }
  }, [id, navigate])

  const handleSubscribe = () => {
    if (!user?.sub || !album) return
    subscriptionStorage.subscribe(user.sub, album.artistId)
    if (album) {
      setAlbum({ ...album, subscribers: album.subscribers + 1 })
    }
  }

  const handleUnsubscribe = () => {
    if (!user?.sub || !album) return
    subscriptionStorage.unsubscribe(user.sub, album.artistId)
    if (album) {
      setAlbum({ ...album, subscribers: Math.max(0, album.subscribers - 1) })
    }
  }

  const handleLike = (songId: string) => {
    if (!user?.sub) return
    const isLiked = likeStorage.toggle(user.sub, songId)
    const song = songs.find(s => s.id === songId)
    if (song) {
      const updatedSong = { ...song, likes: song.likes + (isLiked ? 1 : -1) }
      songStorage.update(songId, updatedSong)
      setSongs(songs.map(s => s.id === songId ? updatedSong : s))
    }
  }

  const handleFavorite = (songId: string) => {
    if (!user?.sub) return
    const wasFavorited = favoriteStorage.isFavorited(user.sub, songId)
    const isNowFavorited = favoriteStorage.toggle(user.sub, songId)
    const song = songs.find(s => s.id === songId)
    if (song) {
      const updatedSong = { ...song, favorites: song.favorites + (isNowFavorited ? 1 : -1) }
      songStorage.update(songId, updatedSong)
      setSongs(songs.map(s => s.id === songId ? updatedSong : s))
    }
  }

  if (!album) {
    return <div>Loading...</div>
  }

  const isSubscribed = user?.sub ? subscriptionStorage.isSubscribed(user.sub, album.artistId) : false

  return (
    <div className="spotify-app">
      <Sidebar />
      <div className="main-content">
        <div className="top-bar">
          <div className="top-bar-left">
            <button className="nav-button prev" onClick={() => navigate('/discover')}>‹</button>
            <button className="nav-button next">›</button>
          </div>
          <div className="top-bar-right">
            {user && <ProfileDropdown user={user} />}
          </div>
        </div>

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
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleLike(song.id)
                      }}
                      className={`action-button ${likeStorage.isLiked(user?.sub || '', song.id) ? 'liked' : ''}`}
                    >
                      ❤️ {song.likes}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleFavorite(song.id)
                      }}
                      className={`action-button ${favoriteStorage.isFavorited(user?.sub || '', song.id) ? 'favorited' : ''}`}
                    >
                      ⭐ {song.favorites}
                    </button>
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

