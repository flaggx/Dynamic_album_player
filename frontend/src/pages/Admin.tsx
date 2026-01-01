import { useState, useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'
import { albumsApi, songsApi, adminApi, BannedUser } from '../services/api'
import { Album, Song } from '../types'
import { useIsAdmin } from '../utils/admin'
import toast from 'react-hot-toast'
import './Admin.css'

const Admin = () => {
  const { user } = useAuth0()
  const navigate = useNavigate()
  const isAdmin = useIsAdmin()
  const [activeTab, setActiveTab] = useState<'albums' | 'songs' | 'users'>('albums')
  const [albums, setAlbums] = useState<Album[]>([])
  const [songs, setSongs] = useState<Song[]>([])
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [banReason, setBanReason] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    if (!isAdmin) {
      console.log('Not admin - checking user roles...')
      console.log('User:', user)
      // Check token claims directly
      if (user) {
        const roles = 
          (user as any)['https://lostcampstudios.com/roles'] ||
          (user as any)['https://lostcampstudios-api/roles'] ||
          (user as any).roles ||
          []
        console.log('User roles from token:', roles)
      }
      toast.error('Admin access required. Make sure you have the admin role assigned and the Auth0 Action is configured.')
      navigate('/')
      return
    }
    loadData()
  }, [isAdmin, activeTab, navigate, user])

  const loadData = async () => {
    setLoading(true)
    try {
      if (activeTab === 'albums') {
        const allAlbums = await albumsApi.getAll()
        setAlbums(allAlbums)
      } else if (activeTab === 'songs') {
        const allSongs = await songsApi.getAll()
        setSongs(allSongs)
      } else if (activeTab === 'users') {
        const [banned, all] = await Promise.all([
          adminApi.getBannedUsers(),
          adminApi.getAllUsers()
        ])
        setBannedUsers(banned)
        setAllUsers(all)
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAlbum = async (albumId: string, albumTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${albumTitle}"? This will also delete all songs and tracks. This cannot be undone.`)) {
      return
    }

    setDeleting(albumId)
    try {
      await adminApi.deleteAlbum(albumId)
      toast.success('Album deleted successfully')
      setAlbums(albums.filter(a => a.id !== albumId))
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete album')
    } finally {
      setDeleting(null)
    }
  }

  const handleDeleteSong = async (songId: string, songTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${songTitle}"? This will also delete all tracks. This cannot be undone.`)) {
      return
    }

    setDeleting(songId)
    try {
      await adminApi.deleteSong(songId)
      toast.success('Song deleted successfully')
      setSongs(songs.filter(s => s.id !== songId))
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete song')
    } finally {
      setDeleting(null)
    }
  }

  const handleBanUser = async (userId: string, userEmail: string) => {
    const reason = banReason[userId] || 'Violation of terms of service'
    
    if (!confirm(`Are you sure you want to ban ${userEmail}?`)) {
      return
    }

    try {
      await adminApi.banUser(userId, reason)
      toast.success('User banned successfully')
      setBanReason({ ...banReason, [userId]: '' })
      await loadData()
    } catch (error: any) {
      toast.error(error.message || 'Failed to ban user')
    }
  }

  const handleUnbanUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to unban ${userEmail}?`)) {
      return
    }

    try {
      await adminApi.unbanUser(userId)
      toast.success('User unbanned successfully')
      await loadData()
    } catch (error: any) {
      toast.error(error.message || 'Failed to unban user')
    }
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="spotify-app">
      <Sidebar />
      <div className="main-content">
        <TopBar />
        <div className="content-area">
          <div className="admin-container">
            <h1>Admin Panel</h1>
            <p className="admin-subtitle">Content moderation and user management</p>

            <div className="admin-tabs">
              <button
                className={`admin-tab ${activeTab === 'albums' ? 'active' : ''}`}
                onClick={() => setActiveTab('albums')}
              >
                Albums ({albums.length})
              </button>
              <button
                className={`admin-tab ${activeTab === 'songs' ? 'active' : ''}`}
                onClick={() => setActiveTab('songs')}
              >
                Songs ({songs.length})
              </button>
              <button
                className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
                onClick={() => setActiveTab('users')}
              >
                Users ({allUsers.length})
              </button>
            </div>

            {loading ? (
              <div className="admin-loading">Loading...</div>
            ) : (
              <div className="admin-content">
                {activeTab === 'albums' && (
                  <div className="admin-list">
                    {albums.length === 0 ? (
                      <p className="admin-empty">No albums found</p>
                    ) : (
                      albums.map(album => (
                        <div key={album.id} className="admin-item">
                          <div className="admin-item-info">
                            <h3>{album.title}</h3>
                            <p>Artist: {album.artist}</p>
                            <p className="admin-item-meta">
                              Created: {new Date(album.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <button
                            className="admin-button danger"
                            onClick={() => handleDeleteAlbum(album.id, album.title)}
                            disabled={deleting === album.id}
                          >
                            {deleting === album.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'songs' && (
                  <div className="admin-list">
                    {songs.length === 0 ? (
                      <p className="admin-empty">No songs found</p>
                    ) : (
                      songs.map(song => (
                        <div key={song.id} className="admin-item">
                          <div className="admin-item-info">
                            <h3>{song.title}</h3>
                            <p>Artist: {song.artist}</p>
                            <p className="admin-item-meta">
                              Created: {new Date(song.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <button
                            className="admin-button danger"
                            onClick={() => handleDeleteSong(song.id, song.title)}
                            disabled={deleting === song.id}
                          >
                            {deleting === song.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'users' && (
                  <div>
                    <div className="admin-search">
                      <input
                        type="text"
                        placeholder="Search users by email or name..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="admin-search-input"
                      />
                    </div>
                    
                    <div className="admin-section">
                      <h2 className="admin-section-title">All Users</h2>
                      <div className="admin-list">
                        {allUsers
                          .filter((user: any) => 
                            !userSearch || 
                            user.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
                            user.name?.toLowerCase().includes(userSearch.toLowerCase())
                          )
                          .map((user: any) => (
                            <div key={user.id} className="admin-item">
                              <div className="admin-item-info">
                                <h3>{user.name || user.email}</h3>
                                <p>Email: {user.email}</p>
                                {user.banned ? (
                                  <>
                                    <p className="admin-item-meta banned">BANNED</p>
                                    {user.banned_reason && (
                                      <p className="admin-item-meta">Reason: {user.banned_reason}</p>
                                    )}
                                  </>
                                ) : (
                                  <p className="admin-item-meta">Active</p>
                                )}
                              </div>
                              <div className="admin-item-actions">
                                {user.banned ? (
                                  <button
                                    className="admin-button success"
                                    onClick={() => handleUnbanUser(user.id, user.email)}
                                  >
                                    Unban
                                  </button>
                                ) : (
                                  <div className="admin-ban-form">
                                    <input
                                      type="text"
                                      placeholder="Ban reason (optional)"
                                      value={banReason[user.id] || ''}
                                      onChange={(e) => setBanReason({ ...banReason, [user.id]: e.target.value })}
                                      className="admin-ban-input"
                                    />
                                    <button
                                      className="admin-button danger"
                                      onClick={() => handleBanUser(user.id, user.email)}
                                    >
                                      Ban
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        {allUsers
                          .filter((user: any) => 
                            !userSearch || 
                            user.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
                            user.name?.toLowerCase().includes(userSearch.toLowerCase())
                          ).length === 0 && (
                          <p className="admin-empty">No users found</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Admin

