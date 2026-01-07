import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import toast from 'react-hot-toast'
import { albumsApi, songsApi } from '../services/api'
import { Album, Song } from '../types'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'
import LoadingSpinner from '../components/LoadingSpinner'
import './CreateAlbum.css'

const EditAlbum = () => {
  const { user } = useAuth0()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  
  const [album, setAlbum] = useState<Album | null>(null)
  const [albumTitle, setAlbumTitle] = useState('')
  const [albumDescription, setAlbumDescription] = useState('')
  const [coverImage, setCoverImage] = useState<File | null>(null)
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null)
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const loadAlbum = async () => {
      if (!id) return
      try {
        const loadedAlbum = await albumsApi.getById(id)
        setAlbum(loadedAlbum)
        setAlbumTitle(loadedAlbum.title)
        setAlbumDescription(loadedAlbum.description || '')
        if (loadedAlbum.coverImage) {
          setCoverImagePreview(loadedAlbum.coverImage)
        }

        const albumSongs = await songsApi.getByAlbum(id)
        setSongs(albumSongs)
      } catch (error) {
        console.error('Error loading album:', error)
        alert('Failed to load album')
        navigate('/my-albums')
      } finally {
        setLoading(false)
      }
    }
    loadAlbum()
  }, [id, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !user?.sub) return

    try {
      await albumsApi.update(id, {
        title: albumTitle,
        description: albumDescription,
      })

      alert('Album updated successfully!')
      navigate(`/album/${id}`)
    } catch (error) {
      console.error('Error updating album:', error)
      alert(`Error updating album: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleDelete = async () => {
    if (!id) return
    if (!window.confirm(`Are you sure you want to delete "${albumTitle}"?\n\n⚠️ WARNING: This action cannot be undone. The album and all its songs will be permanently deleted.`)) {
      return
    }

    const loadingToast = toast.loading('Deleting album...')

    try {
      await albumsApi.delete(id)
      toast.success('Album deleted successfully!', { id: loadingToast })
      navigate('/my-albums')
    } catch (error) {
      console.error('Error deleting album:', error)
      toast.error(`Error deleting album: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: loadingToast })
    }
  }

  const handleDeleteSong = async (songId: string) => {
    const song = songs.find(s => s.id === songId)
    const songTitle = song?.title || 'this song'
    if (!window.confirm(`Are you sure you want to delete "${songTitle}"?\n\n⚠️ WARNING: This action cannot be undone. The song and all its tracks will be permanently deleted.`)) {
      return
    }

    const loadingToast = toast.loading('Deleting song...')

    try {
      await songsApi.delete(songId)
      setSongs(songs.filter(s => s.id !== songId))
      toast.success('Song deleted successfully!', { id: loadingToast })
    } catch (error) {
      console.error('Error deleting song:', error)
      toast.error(`Error deleting song: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: loadingToast })
    }
  }

  if (loading) {
    return (
      <div className="spotify-app">
        <Sidebar />
        <div className="main-content">
          <TopBar />
          <div className="content-area">
            <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
          </div>
        </div>
      </div>
    )
  }

  if (!album) {
    return null
  }

  return (
    <div className="spotify-app">
      <Sidebar />
      <div className="main-content">
        <TopBar />

        <div className="content-area">
          <div className="create-album-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h1>Edit Album</h1>
              <button onClick={handleDelete} className="delete-button" style={{ background: '#e74c3c' }}>
                Delete Album
              </button>
            </div>
        
            <form onSubmit={handleSubmit} className="album-form">
              <div className="form-section">
                <h2>Album Info</h2>
                <div className="form-group">
                  <label>Album Title *</label>
                  <input
                    type="text"
                    value={albumTitle}
                    onChange={(e) => setAlbumTitle(e.target.value)}
                    required
                    placeholder="Enter album title"
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={albumDescription}
                    onChange={(e) => setAlbumDescription(e.target.value)}
                    placeholder="Describe your album..."
                    rows={3}
                  />
                </div>
                <div className="form-group">
                  <label>Cover Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null
                      setCoverImage(file)
                      if (file) {
                        const reader = new FileReader()
                        reader.onloadend = () => {
                          setCoverImagePreview(reader.result as string)
                        }
                        reader.readAsDataURL(file)
                      }
                    }}
                    className="file-input"
                  />
                  {coverImagePreview && (
                    <div className="cover-preview">
                      <img src={coverImagePreview} alt="Cover preview" />
                    </div>
                  )}
                </div>
              </div>

              <div className="form-section">
                <h2>Songs ({songs.length})</h2>
                {songs.length === 0 ? (
                  <p>No songs in this album.</p>
                ) : (
                  <div className="songs-list">
                    {songs.map((song) => (
                      <div key={song.id} className="song-item" style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '1rem',
                        border: '1px solid #333',
                        borderRadius: '8px',
                        marginBottom: '0.5rem'
                      }}>
                        <div>
                          <h3>{song.title}</h3>
                          <p style={{ color: '#999', fontSize: '0.9rem' }}>{song.artist}</p>
                          <p style={{ color: '#666', fontSize: '0.8rem' }}>{song.tracks.length} track(s)</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteSong(song.id)}
                          className="remove-button"
                          style={{ background: '#e74c3c' }}
                        >
                          Delete Song
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => navigate(`/album/${id}`)} className="cancel-button" disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="submit-button" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <LoadingSpinner size="small" /> Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EditAlbum

