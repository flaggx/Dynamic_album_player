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

