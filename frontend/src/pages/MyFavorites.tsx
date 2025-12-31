import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import toast from 'react-hot-toast'
import { favoritesApi, songsApi, albumsApi } from '../services/api'
import { Song, Album } from '../types'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'
import LoadingSpinner from '../components/LoadingSpinner'
import './MyFavorites.css'

const MyFavorites = () => {
  const { user } = useAuth0()
  const [favoriteSongs, setFavoriteSongs] = useState<Array<{ song: Song; album: Album | null }>>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (user?.sub) {
      const loadFavorites = async () => {
        setIsLoading(true)
        try {
          const favorites = await favoritesApi.getUserFavorites(user.sub)
          const songsWithAlbums = await Promise.all(
            favorites.map(async (fav) => {
              try {
                const song = await songsApi.getById(fav.songId)
                const album = await albumsApi.getById(song.albumId).catch(() => null)
                return { song, album }
              } catch {
                return null
              }
            })
          )
          setFavoriteSongs(songsWithAlbums.filter(item => item !== null) as Array<{ song: Song; album: Album | null }>)
        } catch (error) {
          console.error('Error loading favorites:', error)
          toast.error('Failed to load favorites')
        } finally {
          setIsLoading(false)
        }
      }
      loadFavorites()
    }
  }, [user])

  if (!user?.sub) {
    return <div>Loading...</div>
  }

  return (
    <div className="spotify-app">
      <Sidebar />
      <div className="main-content">
        <TopBar />

        <div className="content-area">
          <div className="my-favorites-container">
        <h1>My Favorites</h1>

        {isLoading ? (
          <LoadingSpinner fullScreen />
        ) : favoriteSongs.length === 0 ? (
          <div className="empty-state">
            <p>You haven't favorited any songs yet.</p>
            <Link to="/discover" className="discover-link">
              Discover Albums
            </Link>
          </div>
        ) : (
          <div className="favorites-list">
            {favoriteSongs.map(({ song, album }) => (
              <Link
                key={song.id}
                to={`/album/${song.albumId}`}
                className="favorite-item"
              >
                <div className="favorite-info">
                  <h3>{song.title}</h3>
                  <p className="favorite-artist">{song.artist}</p>
                  {album && (
                    <p className="favorite-album">from {album.title}</p>
                  )}
                </div>
                <div className="favorite-stats">
                  <span>❤️ {song.likes}</span>
                  <span>⭐ {song.favorites}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MyFavorites

