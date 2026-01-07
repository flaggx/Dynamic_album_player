export interface User {
  id: string
  email: string
  name?: string
  picture?: string
  bio?: string
  createdAt: string
}

export interface Track {
  id: string
  name: string
  url: string
  file?: File
  enabled: boolean
}

export interface Song {
  id: string
  title: string
  artist: string
  albumId: string
  tracks: Track[]
  duration?: number
  coverImage?: string
  createdAt: string
  likes: number
  favorites: number
}

export interface Album {
  id: string
  title: string
  artist: string
  artistId: string
  description?: string
  coverImage?: string
  songs: Song[]
  createdAt: string
  updatedAt: string
  likes: number
  subscribers: number
}

export interface Subscription {
  id: string
  userId: string
  artistId: string
  createdAt: string
}

export interface Like {
  id: string
  userId: string
  songId: string
  createdAt: string
}

export interface Favorite {
  id: string
  userId: string
  songId: string
  createdAt: string
}

export interface PremiumStatus {
  isPremium: boolean
  subscriptionStatus: 'free' | 'active' | 'past_due' | 'canceled' | 'trialing'
  subscriptionTier: 'free' | 'premium'
  subscriptionEndsAt: string | null
  stripeCustomerId: string | null
}

export type SongSectionType = 'intro' | 'verse' | 'pre-chorus' | 'chorus' | 'bridge' | 'outro'

export interface Bar {
  id: string
  barNumber: number
  text: string
  chords: Array<{ position: number; chord: string; voicing?: string }> // Position is relative to bar start (0-based)
}

export interface SongSection {
  id: string
  type: SongSectionType
  order: number
  lyrics: string // Kept for backward compatibility with database
  chords: Array<{ position: number; chord: string; voicing?: string }> // Kept for backward compatibility
  bars?: Bar[] // New node-based structure - if present, use this instead of lyrics
}

export interface SongwritingSong {
  id: string
  userId: string
  title: string
  authorFirstName: string
  authorLastName: string
  key: string
  timeSignature: '4/4' | '6/8' | '3/4' | '2/4'
  chordProgression: string[] | null // Roman numerals like ['I', 'IV', 'V', 'vi']
  structure: SongSection[]
  isPublic: boolean
  createdAt: string
  updatedAt: string
}

export interface ChordVoicing {
  name: string
  frets: number[] // [E, A, D, G, B, e] - -1 means muted, 0 means open
  fingers?: number[] // Optional finger positions
  baseFret?: number // If capo or higher position
}

