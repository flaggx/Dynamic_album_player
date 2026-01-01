import { Album, Song, Subscription, Like, Favorite, User } from '../types'

const STORAGE_KEYS = {
  ALBUMS: 'albums',
  SONGS: 'songs',
  SUBSCRIPTIONS: 'subscriptions',
  LIKES: 'likes',
  FAVORITES: 'favorites',
  USERS: 'users',
}

// Helper functions for localStorage
function getItem<T>(key: string, defaultValue: T[]): T[] {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch {
    return defaultValue
  }
}

function setItem<T>(key: string, value: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`Error saving to localStorage (${key}):`, error)
  }
}

// Albums
export const albumStorage = {
  getAll: (): Album[] => getItem(STORAGE_KEYS.ALBUMS, []),
  
  getById: (id: string): Album | undefined => {
    return albumStorage.getAll().find(album => album.id === id)
  },
  
  getByArtist: (artistId: string): Album[] => {
    return albumStorage.getAll().filter(album => album.artistId === artistId)
  },
  
  create: (album: Album): Album => {
    const albums = albumStorage.getAll()
    albums.push(album)
    setItem(STORAGE_KEYS.ALBUMS, albums)
    return album
  },
  
  update: (id: string, updates: Partial<Album>): Album | null => {
    const albums = albumStorage.getAll()
    const index = albums.findIndex(a => a.id === id)
    if (index === -1) return null
    
    albums[index] = { ...albums[index], ...updates, updatedAt: new Date().toISOString() }
    setItem(STORAGE_KEYS.ALBUMS, albums)
    return albums[index]
  },
  
  delete: (id: string): boolean => {
    const albums = albumStorage.getAll()
    const filtered = albums.filter(a => a.id !== id)
    if (filtered.length === albums.length) return false
    setItem(STORAGE_KEYS.ALBUMS, filtered)
    return true
  },
}

// Songs
export const songStorage = {
  getAll: (): Song[] => getItem(STORAGE_KEYS.SONGS, []),
  
  getById: (id: string): Song | undefined => {
    return songStorage.getAll().find(song => song.id === id)
  },
  
  getByAlbum: (albumId: string): Song[] => {
    return songStorage.getAll().filter(song => song.albumId === albumId)
  },
  
  create: (song: Song): Song => {
    const songs = songStorage.getAll()
    songs.push(song)
    setItem(STORAGE_KEYS.SONGS, songs)
    return song
  },
  
  update: (id: string, updates: Partial<Song>): Song | null => {
    const songs = songStorage.getAll()
    const index = songs.findIndex(s => s.id === id)
    if (index === -1) return null
    
    songs[index] = { ...songs[index], ...updates }
    setItem(STORAGE_KEYS.SONGS, songs)
    return songs[index]
  },
  
  delete: (id: string): boolean => {
    const songs = songStorage.getAll()
    const filtered = songs.filter(s => s.id !== id)
    if (filtered.length === songs.length) return false
    setItem(STORAGE_KEYS.SONGS, filtered)
    return true
  },
}

// Subscriptions
export const subscriptionStorage = {
  getAll: (): Subscription[] => getItem(STORAGE_KEYS.SUBSCRIPTIONS, []),
  
  isSubscribed: (userId: string, artistId: string): boolean => {
    return subscriptionStorage.getAll().some(
      sub => sub.userId === userId && sub.artistId === artistId
    )
  },
  
  subscribe: (userId: string, artistId: string): Subscription => {
    const subscriptions = subscriptionStorage.getAll()
    const existing = subscriptions.find(
      sub => sub.userId === userId && sub.artistId === artistId
    )
    
    if (existing) return existing
    
    const subscription: Subscription = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      artistId,
      createdAt: new Date().toISOString(),
    }
    
    subscriptions.push(subscription)
    setItem(STORAGE_KEYS.SUBSCRIPTIONS, subscriptions)
    return subscription
  },
  
  unsubscribe: (userId: string, artistId: string): boolean => {
    const subscriptions = subscriptionStorage.getAll()
    const filtered = subscriptions.filter(
      sub => !(sub.userId === userId && sub.artistId === artistId)
    )
    
    if (filtered.length === subscriptions.length) return false
    setItem(STORAGE_KEYS.SUBSCRIPTIONS, filtered)
    return true
  },
  
  getSubscriptions: (userId: string): Subscription[] => {
    return subscriptionStorage.getAll().filter(sub => sub.userId === userId)
  },
}

// Likes
export const likeStorage = {
  isLiked: (userId: string, songId: string): boolean => {
    return getItem<Like>(STORAGE_KEYS.LIKES, []).some(
      like => like.userId === userId && like.songId === songId
    )
  },
  
  toggle: (userId: string, songId: string): boolean => {
    const likes = getItem<Like>(STORAGE_KEYS.LIKES, [])
    const existingIndex = likes.findIndex(
      like => like.userId === userId && like.songId === songId
    )
    
    if (existingIndex !== -1) {
      likes.splice(existingIndex, 1)
      setItem(STORAGE_KEYS.LIKES, likes)
      return false // unliked
    } else {
      likes.push({
        id: `like_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        songId,
        createdAt: new Date().toISOString(),
      })
      setItem(STORAGE_KEYS.LIKES, likes)
      return true // liked
    }
  },
  
  getCount: (songId: string): number => {
    return getItem<Like>(STORAGE_KEYS.LIKES, []).filter(like => like.songId === songId).length
  },
}

// Favorites
export const favoriteStorage = {
  isFavorited: (userId: string, songId: string): boolean => {
    return getItem<Favorite>(STORAGE_KEYS.FAVORITES, []).some(
      fav => fav.userId === userId && fav.songId === songId
    )
  },
  
  toggle: (userId: string, songId: string): boolean => {
    const favorites = getItem<Favorite>(STORAGE_KEYS.FAVORITES, [])
    const existingIndex = favorites.findIndex(
      fav => fav.userId === userId && fav.songId === songId
    )
    
    if (existingIndex !== -1) {
      favorites.splice(existingIndex, 1)
      setItem(STORAGE_KEYS.FAVORITES, favorites)
      return false // unfavorited
    } else {
      favorites.push({
        id: `fav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        songId,
        createdAt: new Date().toISOString(),
      })
      setItem(STORAGE_KEYS.FAVORITES, favorites)
      return true // favorited
    }
  },
  
  getCount: (songId: string): number => {
    return getItem<Favorite>(STORAGE_KEYS.FAVORITES, []).filter(fav => fav.songId === songId).length
  },
  
  getUserFavorites: (userId: string): Favorite[] => {
    return getItem<Favorite>(STORAGE_KEYS.FAVORITES, []).filter(fav => fav.userId === userId)
  },
}

