import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import { favoritesApi, songsApi, albumsApi } from '../services/api'
import { Song, Album } from '../types'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'
import LoadingSpinner from '../components/LoadingSpinner'
import './MyFavorites.css'

const MyFavorites = () => {
  const { user, getAccessTokenSilently } = useAuth()
  const [favoriteSongs, setFavoriteSongs] = useState<Array<{ song: Song; album: Album | null }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [tokenReady, setTokenReady] = useState(false)

  // Wait for access token to be available
  useEffect(() => {
    const waitForToken = async () => {
      if (!user?.sub) {
        setTokenReady(false)
        return
      }

      // Wait briefly for session + API token wiring
      await new Promise(resolve => setTimeout(resolve, 500))

      try {
        await getAccessTokenSilently()
        setTokenReady(true)
      } catch (error) {
        console.warn('Token not ready yet, will retry:', error)
        setTimeout(() => setTokenReady(true), 1000)
      }
    }

    waitForToken()
  }, [user, getAccessTokenSilently])

  useEffect(() => {
    if (user?.sub && tokenReady) {
      const loadFavorites = async () => {
        setIsLoading(true)
        try {
          const favorites = await favoritesApi.getUserFavorites(user.sub || '')
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
  }, [user, tokenReady])

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
            <Link href="/discover" className="discover-link">
              Discover Albums
            </Link>
          </div>
        ) : (
          <div className="favorites-list">
            {favoriteSongs.map(({ song, album }) => (
              <Link
                key={song.id}
                href={`/album/${song.albumId}`}
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

