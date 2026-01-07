import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import toast from 'react-hot-toast'
import { albumsApi, songwritingApi } from '../services/api'
import { Album, SongwritingSong } from '../types'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'
import LoadingSpinner from '../components/LoadingSpinner'
import './MyAlbums.css'

const DRAFT_STORAGE_KEY = 'songwriting-draft'

interface LocalDraft {
  title: string
  authorFirstName?: string
  authorLastName?: string
  key?: string
  timeSignature?: string
  tempo?: number
  chordProgression?: string[]
  structure?: any[]
  isPublic?: boolean
  savedAt?: string
}

const MyAlbums = () => {
  const { user, isAuthenticated } = useAuth0()
  const [albums, setAlbums] = useState<Album[]>([])
  const [songs, setSongs] = useState<SongwritingSong[]>([])
  const [drafts, setDrafts] = useState<LocalDraft[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'albums' | 'songs'>('albums')

  useEffect(() => {
    if (user?.sub) {
      const loadData = async () => {
        setIsLoading(true)
        try {
          const [userAlbums, allSongs] = await Promise.all([
            albumsApi.getByArtist(user.sub || ''),
            songwritingApi.getAll(),
          ])
          
          userAlbums.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          setAlbums(userAlbums)
          
          const userSongs = allSongs
            .filter(s => s.userId === user.sub)
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          setSongs(userSongs)
        } catch (error) {
          console.error('Error loading data:', error)
          toast.error('Failed to load data')
        } finally {
          setIsLoading(false)
        }
      }
      loadData()
    }

    // Load drafts from localStorage
    try {
      const draftStr = localStorage.getItem(DRAFT_STORAGE_KEY)
      if (draftStr) {
        const draft = JSON.parse(draftStr)
        if (draft && draft.title) {
          setDrafts([{
            ...draft,
            savedAt: new Date().toISOString(), // Use current time as fallback
          }])
        }
      }
    } catch (error) {
      console.error('Error loading drafts:', error)
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
          <h1>Your Library</h1>
          <div className="library-tabs">
            <button
              className={`tab-button ${activeTab === 'albums' ? 'active' : ''}`}
              onClick={() => setActiveTab('albums')}
            >
              Albums ({albums.length})
            </button>
            <button
              className={`tab-button ${activeTab === 'songs' ? 'active' : ''}`}
              onClick={() => setActiveTab('songs')}
            >
              Songs ({songs.length + drafts.length})
            </button>
          </div>
          <div className="header-actions">
            {activeTab === 'albums' && (
              <Link to="/create-album" className="create-album-link">
                + Create New Album
              </Link>
            )}
            {activeTab === 'songs' && (
              <Link to="/songwriting" className="create-album-link">
                + Create New Song
              </Link>
            )}
          </div>
        </div>

        {isLoading ? (
          <LoadingSpinner fullScreen />
        ) : activeTab === 'albums' ? (
          albums.length === 0 ? (
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
          )
        ) : (
          songs.length === 0 && drafts.length === 0 ? (
            <div className="empty-state">
              <p>You haven't created any songs yet.</p>
              <Link to="/songwriting" className="create-link">
                Create Your First Song
              </Link>
            </div>
          ) : (
            <div>
              {/* Saved Songs Section */}
              {songs.length > 0 && (
                <div>
                  <h2 style={{ marginTop: '2rem', marginBottom: '1rem', color: '#fff' }}>Saved Songs</h2>
                  <div className="albums-grid">
                    {songs.map(song => (
                      <div key={song.id} className="album-card" style={{ position: 'relative' }}>
                        <Link to={`/songwriting/${song.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                          <div className="album-cover">
                            <div className="album-placeholder" style={{ background: 'linear-gradient(135deg, #1db954 0%, #1ed760 100%)' }}>
                              <span style={{ fontSize: '2rem' }}>🎼</span>
                            </div>
                          </div>
                          <div className="album-info">
                            <h3>{song.title}</h3>
                            <p className="album-songs">{song.structure.length} section{song.structure.length !== 1 ? 's' : ''}</p>
                            <div className="album-stats">
                              <span>Key: {song.key}</span>
                              {song.isPublic && <span>Public</span>}
                            </div>
                          </div>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Drafts Section */}
              {drafts.length > 0 && (
                <div>
                  <h2 style={{ marginTop: '2rem', marginBottom: '1rem', color: '#fff' }}>
                    Drafts
                    <span style={{ fontSize: '0.9rem', color: '#b3b3b3', marginLeft: '0.5rem', fontWeight: 'normal' }}>
                      (Saved locally - not stored long-term)
                    </span>
                  </h2>
                  <div className="albums-grid">
                    {drafts.map((draft, idx) => (
                      <div key={`draft-${idx}`} className="album-card" style={{ position: 'relative', border: '2px solid #ffa500' }}>
                        <Link to="/songwriting" style={{ textDecoration: 'none', color: 'inherit' }}>
                          <div className="album-cover">
                            <div className="album-placeholder" style={{ background: 'linear-gradient(135deg, #ffa500 0%, #ff8c00 100%)' }}>
                              <span style={{ fontSize: '2rem' }}>📝</span>
                            </div>
                          </div>
                          <div className="album-info">
                            <h3>{draft.title || 'Untitled Draft'}</h3>
                            <p className="album-songs" style={{ color: '#ffa500' }}>Draft</p>
                            <div className="album-stats">
                              {draft.key && <span>Key: {draft.key}</span>}
                              <span style={{ color: '#ffa500' }}>Local Only</span>
                            </div>
                          </div>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MyAlbums

