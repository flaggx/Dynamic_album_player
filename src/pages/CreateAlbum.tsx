import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { albumStorage, songStorage } from '../services/storage'
import { Album, Song, Track } from '../types'
import ProfileDropdown from '../components/ProfileDropdown'
import './CreateAlbum.css'

const CreateAlbum = () => {
  const { user } = useAuth0()
  const navigate = useNavigate()
  
  const [albumTitle, setAlbumTitle] = useState('')
  const [albumDescription, setAlbumDescription] = useState('')
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
    if (!user?.sub) return

    // Create album
    const album: Album = {
      id: `album_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: albumTitle,
      artist: user.name || user.email || 'Unknown Artist',
      artistId: user.sub,
      description: albumDescription,
      songs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      likes: 0,
      subscribers: 0,
    }

    // Process each song
    const createdSongs: Song[] = []
    for (const songData of songs) {
      if (!songData.title || songData.tracks.length === 0) continue

      // Create URLs for uploaded files (using object URLs for now)
      const processedTracks: Track[] = songData.tracks
        .filter(t => t.file && t.name)
        .map((t, idx) => ({
          id: `track_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 9)}`,
          name: t.name,
          url: t.file ? URL.createObjectURL(t.file) : '',
          enabled: true,
        }))

      if (processedTracks.length === 0) continue

      const song: Song = {
        id: `song_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: songData.title,
        artist: songData.artist || album.artist,
        albumId: album.id,
        tracks: processedTracks,
        createdAt: new Date().toISOString(),
        likes: 0,
        favorites: 0,
      }

      createdSongs.push(song)
      songStorage.create(song)
    }

    if (createdSongs.length === 0) {
      alert('Please add at least one song with tracks!')
      return
    }

    album.songs = createdSongs.map(s => s.id)
    albumStorage.create(album)

    alert('Album created successfully!')
    navigate(`/album/${album.id}`)
  }

  return (
    <div className="create-album">
      <div className="create-album-header-bar">
        <Link to="/" className="home-link-top">
          🏠 Home
        </Link>
        {user && <ProfileDropdown user={user} />}
      </div>
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
                        accept="audio/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null
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
            <button type="button" onClick={() => navigate('/')} className="cancel-button">
              Cancel
            </button>
            <button type="submit" className="submit-button">
              Create Album
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateAlbum

