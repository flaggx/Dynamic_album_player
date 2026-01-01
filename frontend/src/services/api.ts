import { Album, Song, Track, Subscription, Like, Favorite, User } from '../types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// Helper to get auth token (will be set by auth context)
let getAccessToken: (() => Promise<string | undefined>) | null = null

export const setAuthTokenGetter = (getter: () => Promise<string | undefined>) => {
  getAccessToken = getter
}

// Helper function for API calls
async function apiCall<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> || {}),
  }

  // Add auth token if available
  if (getAccessToken) {
    try {
      const token = await getAccessToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      } else {
        console.warn('No access token available')
      }
    } catch (error) {
      console.error('Error getting access token:', error)
      // Try to continue - the API will return 401 if token is required
    }
  } else {
    console.warn('getAccessToken function not set')
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || `HTTP error! status: ${response.status}`)
  }

  return response.json()
}

// Albums API
export const albumsApi = {
  getAll: async (search?: string): Promise<Album[]> => {
    const url = search ? `/api/albums?search=${encodeURIComponent(search)}` : '/api/albums'
    const albums = await apiCall<Array<any>>(url)
    return albums.map(album => ({
      ...album,
      songs: album.songs || [],
      createdAt: album.created_at || album.createdAt,
      updatedAt: album.updated_at || album.updatedAt,
    }))
  },

  getById: async (id: string): Promise<Album> => {
    const album = await apiCall<any>(`/api/albums/${id}`)
    return {
      ...album,
      songs: album.songs || [],
      createdAt: album.created_at || album.createdAt,
      updatedAt: album.updated_at || album.updatedAt,
    }
  },

  getByArtist: async (artistId: string): Promise<Album[]> => {
    const albums = await apiCall<Array<any>>(`/api/albums/artist/${artistId}`)
    return albums.map(album => ({
      ...album,
      songs: album.songs || [],
      createdAt: album.created_at || album.createdAt,
      updatedAt: album.updated_at || album.updatedAt,
    }))
  },

  create: async (album: Omit<Album, 'id' | 'createdAt' | 'updatedAt'> & { coverImageFile?: File }): Promise<Album> => {
    const formData = new FormData()
    formData.append('title', album.title)
    formData.append('artist', album.artist)
    if (album.description) formData.append('description', album.description)
    if (album.coverImageFile) {
      formData.append('coverImage', album.coverImageFile)
    }

    const headers: HeadersInit = {}
    // Add auth token if available
    if (getAccessToken) {
      const token = await getAccessToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    }

    const response = await fetch(`${API_URL}/api/albums`, {
      method: 'POST',
      headers,
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error || `HTTP error! status: ${response.status}`)
    }

    const created = await response.json()
    return {
      ...created,
      songs: [],
      createdAt: created.created_at || new Date().toISOString(),
      updatedAt: created.updated_at || new Date().toISOString(),
      likes: 0,
      subscribers: 0,
    }
  },

  update: async (id: string, updates: Partial<Album>): Promise<Album> => {
    const updated = await apiCall<any>(`/api/albums/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
    return {
      ...updated,
      songs: updated.songs || [],
      createdAt: updated.created_at || updated.createdAt,
      updatedAt: updated.updated_at || new Date().toISOString(),
    }
  },

  delete: async (id: string): Promise<void> => {
    await apiCall(`/api/albums/${id}`, { method: 'DELETE' })
  },
}

// Songs API
export const songsApi = {
  getAll: async (): Promise<Song[]> => {
    const songs = await apiCall<Array<any>>('/api/songs')
    return songs.map(song => ({
      ...song,
      tracks: [],
      createdAt: song.created_at || song.createdAt,
    }))
  },

  getById: async (id: string): Promise<Song> => {
    const song = await apiCall<any>(`/api/songs/${id}`)
    return {
      ...song,
      tracks: song.tracks?.map((track: any) => ({
        id: track.id,
        name: track.name,
        url: `${API_URL}${track.file_path}`,
        enabled: track.enabled === 1,
      })) || [],
      createdAt: song.created_at || song.createdAt,
    }
  },

  getByAlbum: async (albumId: string): Promise<Song[]> => {
    const songs = await apiCall<Array<any>>(`/api/songs/album/${albumId}`)
    return Promise.all(songs.map(async (song) => {
      const fullSong = await songsApi.getById(song.id)
      return fullSong
    }))
  },

  create: async (song: {
    title: string
    artist: string
    albumId: string
    tracks: Array<{ name: string; file: File }>
  }): Promise<Song> => {
    const formData = new FormData()
    formData.append('title', song.title)
    formData.append('artist', song.artist)
    formData.append('albumId', song.albumId)
    formData.append('trackNames', JSON.stringify(song.tracks.map(t => t.name)))
    
    song.tracks.forEach(track => {
      formData.append('tracks', track.file)
    })

    const created = await fetch(`${API_URL}/api/songs`, {
      method: 'POST',
      body: formData,
    }).then(res => res.json())

    return {
      ...created,
      tracks: created.tracks?.map((track: any) => ({
        id: track.id,
        name: track.name,
        url: `${API_URL}${track.url || track.file_path || ''}`,
        enabled: track.enabled,
      })) || [],
      createdAt: created.created_at || new Date().toISOString(),
      likes: 0,
      favorites: 0,
    }
  },

  update: async (id: string, updates: Partial<Song>): Promise<Song> => {
    const updated = await apiCall<any>(`/api/songs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
    return {
      ...updated,
      tracks: updated.tracks || [],
      createdAt: updated.created_at || updated.createdAt,
    }
  },

  delete: async (id: string): Promise<void> => {
    await apiCall(`/api/songs/${id}`, { method: 'DELETE' })
  },
}

// Users API
export const usersApi = {
  getById: async (id: string): Promise<User> => {
    const user = await apiCall<any>(`/api/users/${id}`)
    return {
      ...user,
      createdAt: user.created_at || user.createdAt,
    }
  },

  createOrUpdate: async (user: Omit<User, 'createdAt'>): Promise<User> => {
    const created = await apiCall<any>('/api/users', {
      method: 'POST',
      body: JSON.stringify({
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        bio: user.bio,
      }),
    })
    return {
      ...created,
      createdAt: created.created_at || new Date().toISOString(),
    }
  },
}

// Subscriptions API
export const subscriptionsApi = {
  getUserSubscriptions: async (userId: string): Promise<Subscription[]> => {
    const subscriptions = await apiCall<Array<any>>(`/api/subscriptions/user/${userId}`)
    return subscriptions.map(sub => ({
      ...sub,
      createdAt: sub.created_at || sub.createdAt,
    }))
  },

  check: async (userId: string, artistId: string): Promise<boolean> => {
    const result = await apiCall<{ isSubscribed: boolean }>(`/api/subscriptions/check/${userId}/${artistId}`)
    return result.isSubscribed
  },

  subscribe: async (userId: string, artistId: string): Promise<Subscription> => {
    const subscription = await apiCall<any>('/api/subscriptions', {
      method: 'POST',
      body: JSON.stringify({ artistId }), // userId comes from token
    })
    return {
      ...subscription,
      createdAt: subscription.created_at || new Date().toISOString(),
    }
  },

  unsubscribe: async (userId: string, artistId: string): Promise<void> => {
    await apiCall(`/api/subscriptions/${userId}/${artistId}`, { method: 'DELETE' })
  },

  getSubscriberCount: async (artistId: string): Promise<number> => {
    const result = await apiCall<{ count: number }>(`/api/subscriptions/artist/${artistId}/count`)
    return result.count
  },
}

// Likes API
export const likesApi = {
  getCount: async (songId: string): Promise<number> => {
    const result = await apiCall<{ count: number }>(`/api/likes/song/${songId}/count`)
    return result.count
  },

  check: async (userId: string, songId: string): Promise<boolean> => {
    const result = await apiCall<{ isLiked: boolean }>(`/api/likes/check/${userId}/${songId}`)
    return result.isLiked
  },

  toggle: async (userId: string, songId: string): Promise<boolean> => {
    const result = await apiCall<{ isLiked: boolean }>('/api/likes/toggle', {
      method: 'POST',
      body: JSON.stringify({ songId }), // userId comes from token
    })
    return result.isLiked
  },
}

// Favorites API
export const favoritesApi = {
  getUserFavorites: async (userId: string): Promise<Favorite[]> => {
    const favorites = await apiCall<Array<any>>(`/api/favorites/user/${userId}`)
    return favorites.map(fav => ({
      ...fav,
      createdAt: fav.created_at || fav.createdAt,
    }))
  },

  getCount: async (songId: string): Promise<number> => {
    const result = await apiCall<{ count: number }>(`/api/favorites/song/${songId}/count`)
    return result.count
  },

  check: async (userId: string, songId: string): Promise<boolean> => {
    const result = await apiCall<{ isFavorited: boolean }>(`/api/favorites/check/${userId}/${songId}`)
    return result.isFavorited
  },

  toggle: async (userId: string, songId: string): Promise<boolean> => {
    const result = await apiCall<{ isFavorited: boolean }>('/api/favorites/toggle', {
      method: 'POST',
      body: JSON.stringify({ songId }), // userId comes from token
    })
    return result.isFavorited
  },
}

// Admin API
export interface BannedUser {
  id: string
  email: string
  name: string
  banned_reason?: string
  banned_at?: string
}

export const adminApi = {
  deleteAlbum: async (albumId: string): Promise<void> => {
    await apiCall(`/api/admin/albums/${albumId}`, { method: 'DELETE' })
  },

  deleteSong: async (songId: string): Promise<void> => {
    await apiCall(`/api/admin/songs/${songId}`, { method: 'DELETE' })
  },

  banUser: async (userId: string, reason?: string): Promise<{ message: string; user: any }> => {
    return apiCall(`/api/admin/users/${userId}/ban`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    })
  },

  unbanUser: async (userId: string): Promise<{ message: string; user: any }> => {
    return apiCall(`/api/admin/users/${userId}/unban`, {
      method: 'POST',
    })
  },

  getBannedUsers: async (): Promise<BannedUser[]> => {
    return apiCall<BannedUser[]>('/api/admin/users/banned')
  },

  getAllUsers: async (): Promise<any[]> => {
    return apiCall<any[]>('/api/admin/users')
  },
}

