import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { albumStorage } from '../services/storage'
import { Album } from '../types'
import Sidebar from '../components/Sidebar'
import ProfileDropdown from '../components/ProfileDropdown'
import './MyAlbums.css'

const MyAlbums = () => {
  const { user } = useAuth0()
  const [albums, setAlbums] = useState<Album[]>([])

  useEffect(() => {
    if (user?.sub) {
      const userAlbums = albumStorage.getByArtist(user.sub)
      userAlbums.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setAlbums(userAlbums)
    }
  }, [user])

  if (!user?.sub) {
    return <div>Loading...</div>
  }

  return (
    <div className="spotify-app">
      <Sidebar />
      <div className="main-content">
        <div className="top-bar">
          <div className="top-bar-left">
            <button className="nav-button prev">‹</button>
            <button className="nav-button next">›</button>
          </div>
          <div className="top-bar-right">
            {user && <ProfileDropdown user={user} />}
          </div>
        </div>

        <div className="content-area">
          <div className="my-albums-container">
        <div className="my-albums-header">
          <h1>My Albums</h1>
          <Link to="/create-album" className="create-album-link">
            + Create New Album
          </Link>
        </div>

        {albums.length === 0 ? (
          <div className="empty-state">
            <p>You haven't created any albums yet.</p>
            <Link to="/create-album" className="create-link">
              Create Your First Album
            </Link>
          </div>
        ) : (
          <div className="albums-grid">
            {albums.map(album => (
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
  )
}

export default MyAlbums

