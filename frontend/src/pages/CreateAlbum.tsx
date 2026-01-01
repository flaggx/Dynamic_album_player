import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import toast from 'react-hot-toast'
import { albumsApi, songsApi } from '../services/api'
import { Song } from '../types'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'
import LoadingSpinner from '../components/LoadingSpinner'
import './CreateAlbum.css'

const CreateAlbum = () => {
  const { user } = useAuth0()
  const navigate = useNavigate()
  
  const [albumTitle, setAlbumTitle] = useState('')
  const [albumDescription, setAlbumDescription] = useState('')
  const [coverImage, setCoverImage] = useState<File | null>(null)
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [songs, setSongs] = useState<Array<{
    title: string
    artist: string
    tracks: Array<{ name: string; file: File | null }>
  }>>([{ title: '', artist: '', tracks: [{ name: '', file: null }] }])

  const addSong = () => {
    setSongs([...songs, { title: '', artist: '', tracks: [{ name: '', file: null }] }])
  }

  const removeSong = (index: number) => {
    setSongs(songs.filter((_, i) => i !== index))
  }

  const updateSong = (index: number, field: 'title' | 'artist', value: string) => {
    const updated = [...songs]
    updated[index][field] = value
    setSongs(updated)
  }

  const addTrack = (songIndex: number) => {
    const updated = [...songs]
    updated[songIndex].tracks.push({ name: '', file: null })
    setSongs(updated)
  }

  const removeTrack = (songIndex: number, trackIndex: number) => {
    const updated = [...songs]
    updated[songIndex].tracks = updated[songIndex].tracks.filter((_, i) => i !== trackIndex)
    setSongs(updated)
  }

  const updateTrack = (songIndex: number, trackIndex: number, name: string, file: File | null) => {
    const updated = [...songs]
    updated[songIndex].tracks[trackIndex] = { name, file }
    setSongs(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.sub) {
      toast.error('You must be logged in to create an album')
      return
    }

    if (!albumTitle.trim()) {
      toast.error('Please enter an album title')
      return
    }

    // Validate songs
    const validSongs = songs.filter(s => s.title.trim() && s.tracks.some(t => t.file && t.name))
    if (validSongs.length === 0) {
      toast.error('Please add at least one song with tracks')
      return
    }

    setIsSubmitting(true)
    const loadingToast = toast.loading('Creating album...')

    try {
      // Create album first (artistId comes from auth token)
      const album = await albumsApi.create({
        title: albumTitle.trim(),
        artist: user.name || user.email || 'Unknown Artist',
        artistId: user.sub, // Still needed for type, but backend uses token
        description: albumDescription.trim() || undefined,
        coverImage: undefined,
        coverImageFile: coverImage || undefined,
        songs: [],
        likes: 0,
        subscribers: 0,
      })

      toast.loading('Uploading songs...', { id: loadingToast })

      // Upload each song with tracks
      const createdSongs: Song[] = []
      for (const songData of validSongs) {
        // Filter tracks that have files
        const tracksWithFiles = songData.tracks.filter(t => t.file && t.name)
        if (tracksWithFiles.length === 0) continue

        try {
          const song = await songsApi.create({
            title: songData.title.trim(),
            artist: (songData.artist || album.artist).trim(),
            albumId: album.id,
            tracks: tracksWithFiles.map(t => ({
              name: t.name!.trim(),
              file: t.file!,
            })),
          })

          createdSongs.push(song)
        } catch (error) {
          console.error('Error creating song:', error)
          toast.error(`Error uploading song "${songData.title}": ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      if (createdSongs.length === 0) {
        toast.error('No songs were uploaded. Please try again.', { id: loadingToast })
        // Delete the album if no songs were created
        try {
          await albumsApi.delete(album.id)
        } catch (deleteError) {
          console.error('Error deleting empty album:', deleteError)
        }
        setIsSubmitting(false)
        return
      }

      toast.success(`Album created successfully with ${createdSongs.length} song(s)!`, { id: loadingToast })
      navigate(`/album/${album.id}`)
    } catch (error) {
      console.error('Error creating album:', error)
      toast.error(`Error creating album: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: loadingToast })
      setIsSubmitting(false)
    }
  }

  return (
    <div className="spotify-app">
      <Sidebar />
      <div className="main-content">
        <TopBar />

        <div className="content-area">
          <div className="create-album-container">
            <h1>Create Album</h1>
        
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
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null
                  if (file) {
                    // Validate file size (5MB limit)
                    const maxSize = 5 * 1024 * 1024
                    if (file.size > maxSize) {
                      toast.error(`Image "${file.name}" is too large. Maximum size is 5MB.`)
                      e.target.value = ''
                      return
                    }
                    // Validate file type
                    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
                    if (!validTypes.includes(file.type)) {
                      toast.error(`File "${file.name}" is not a valid image file.`)
                      e.target.value = ''
                      return
                    }
                    setCoverImage(file)
                    const reader = new FileReader()
                    reader.onloadend = () => {
                      setCoverImagePreview(reader.result as string)
                    }
                    reader.readAsDataURL(file)
                  } else {
                    setCoverImage(null)
                    setCoverImagePreview(null)
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
            <div className="section-header">
              <h2>Songs</h2>
              <button type="button" onClick={addSong} className="add-button">
                + Add Song
              </button>
            </div>

            {songs.map((song, songIndex) => (
              <div key={songIndex} className="song-card">
                <div className="song-header">
                  <h3>Song {songIndex + 1}</h3>
                  {songs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSong(songIndex)}
                      className="remove-button"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="form-group">
                  <label>Song Title *</label>
                  <input
                    type="text"
                    value={song.title}
                    onChange={(e) => updateSong(songIndex, 'title', e.target.value)}
                    required
                    placeholder="Enter song title"
                  />
                </div>

                <div className="form-group">
                  <label>Artist (defaults to album artist)</label>
                  <input
                    type="text"
                    value={song.artist}
                    onChange={(e) => updateSong(songIndex, 'artist', e.target.value)}
                    placeholder="Enter artist name"
                  />
                </div>

                <div className="tracks-section">
                  <div className="tracks-header">
                    <label>Tracks *</label>
                    <button
                      type="button"
                      onClick={() => addTrack(songIndex)}
                      className="add-button small"
                    >
                      + Add Track
                    </button>
                  </div>

                  {song.tracks.map((track, trackIndex) => (
                    <div key={trackIndex} className="track-row">
                      <input
                        type="text"
                        value={track.name}
                        onChange={(e) => updateTrack(songIndex, trackIndex, e.target.value, track.file)}
                        placeholder="Track name (e.g., Vocals, Drums)"
                        required
                        className="track-name-input"
                      />
                      <input
                        type="file"
                        accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null
                          if (file) {
                            // Validate file size (10MB limit)
                            const maxSize = 10 * 1024 * 1024
                            if (file.size > maxSize) {
                              toast.error(`File "${file.name}" is too large. Maximum size is 10MB.`)
                              e.target.value = ''
                              return
                            }
                            // Validate file type
                            const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/aac', 'audio/flac']
                            const validExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac']
                            const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
                            if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
                              toast.error(`File "${file.name}" is not a valid audio file.`)
                              e.target.value = ''
                              return
                            }
                          }
                          updateTrack(songIndex, trackIndex, track.name, file)
                        }}
                        required
                        className="track-file-input"
                      />
                      {song.tracks.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTrack(songIndex, trackIndex)}
                          className="remove-button small"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="form-actions">
            <button type="button" onClick={() => navigate('/')} className="cancel-button" disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="submit-button" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="small" /> Creating...
                </>
              ) : (
                'Create Album'
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

export default CreateAlbum

