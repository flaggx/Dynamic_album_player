import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { favoriteStorage, songStorage, albumStorage } from '../services/storage'
import { Song, Album } from '../types'
import ProfileDropdown from '../components/ProfileDropdown'
import './MyFavorites.css'

const MyFavorites = () => {
  const { user } = useAuth0()
  const [favoriteSongs, setFavoriteSongs] = useState<Array<{ song: Song; album: Album | null }>>([])

  useEffect(() => {
    if (user?.sub) {
      const favorites = favoriteStorage.getUserFavorites(user.sub)
      const songsWithAlbums = favorites.map(fav => {
        const song = songStorage.getById(fav.songId)
        const album = song ? albumStorage.getById(song.albumId) : null
        return { song, album }
      }).filter(item => item.song !== undefined) as Array<{ song: Song; album: Album | null }>
      
      setFavoriteSongs(songsWithAlbums)
    }
  }, [user])

  if (!user?.sub) {
    return <div>Loading...</div>
  }

  return (
    <div className="my-favorites-page">
      <div className="my-favorites-header-bar">
        <Link to="/" className="home-link-top">
          🏠 Home
        </Link>
        {user && <ProfileDropdown user={user} />}
      </div>
      <div className="my-favorites-container">
        <h1>My Favorites</h1>

        {favoriteSongs.length === 0 ? (
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
  )
}

export default MyFavorites

