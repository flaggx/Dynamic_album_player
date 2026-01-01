import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import toast from 'react-hot-toast'
import { albumsApi } from '../services/api'
import { Album } from '../types'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'
import LoadingSpinner from '../components/LoadingSpinner'
import './MyAlbums.css'

const MyAlbums = () => {
  const { user } = useAuth0()
  const [albums, setAlbums] = useState<Album[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (user?.sub) {
      const loadAlbums = async () => {
        setIsLoading(true)
        try {
          const userAlbums = await albumsApi.getByArtist(user.sub || '')
          userAlbums.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          setAlbums(userAlbums)
        } catch (error) {
          console.error('Error loading albums:', error)
          toast.error('Failed to load albums')
        } finally {
          setIsLoading(false)
        }
      }
      loadAlbums()
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
          <div className="my-albums-container">
        <div className="my-albums-header">
          <h1>My Albums</h1>
          <Link to="/create-album" className="create-album-link">
            + Create New Album
          </Link>
        </div>

        {isLoading ? (
          <LoadingSpinner fullScreen />
        ) : albums.length === 0 ? (
          <div className="empty-state">
            <p>You haven't created any albums yet.</p>
            <Link to="/create-album" className="create-link">
              Create Your First Album
            </Link>
          </div>
        ) : (
          <div className="albums-grid">
            {albums.map(album => (
              <div key={album.id} className="album-card" style={{ position: 'relative' }}>
                <Link to={`/album/${album.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
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
                <div style={{ 
                  position: 'absolute', 
                  top: '10px', 
                  right: '10px', 
                  display: 'flex', 
                  gap: '0.5rem' 
                }}>
                  <Link 
                    to={`/edit-album/${album.id}`}
                    className="edit-button"
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#1db954',
                      color: 'white',
                      borderRadius: '4px',
                      textDecoration: 'none',
                      fontSize: '0.9rem'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Edit
                  </Link>
                </div>
              </div>
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

