import { describe, it, expect, beforeEach, vi, beforeAll, afterAll } from 'vitest'
import { albumsApi, songsApi, usersApi, subscriptionsApi, likesApi, favoritesApi } from '../api'
import { server } from '../../test/mocks/server'

// Store original fetch
const originalFetch = global.fetch

// Mock fetch properly
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('API Service', () => {
  // Disable MSW for these unit tests since we're testing the API service directly
  beforeAll(() => {
    // Close MSW server to prevent it from intercepting fetch calls
    server.close()
    // Ensure our mock fetch is used
    global.fetch = mockFetch
  })

  afterAll(() => {
    // Re-enable MSW for other tests
    server.listen({ onUnhandledRequest: 'error' })
    // Restore original fetch
    global.fetch = originalFetch
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockClear()
  })

  describe('albumsApi', () => {
    it('should get all albums', async () => {
      const mockAlbums = [
        {
          id: 'album1',
          title: 'Test Album',
          artist: 'Test Artist',
          artistId: 'user1',
          created_at: '2024-01-01T00:00:00Z',
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAlbums,
      })

      const albums = await albumsApi.getAll()
      expect(albums).toHaveLength(1)
      expect(albums[0].title).toBe('Test Album')
    })

    it('should get album by id', async () => {
      const mockAlbum = {
        id: 'album1',
        title: 'Test Album',
        artist: 'Test Artist',
        artistId: 'user1',
        created_at: '2024-01-01T00:00:00Z',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAlbum,
      })

      const album = await albumsApi.getById('album1')
      expect(album.title).toBe('Test Album')
    })

    it('should create album', async () => {
      const newAlbum = {
        title: 'New Album',
        artist: 'New Artist',
        artistId: 'user1',
        description: 'Description',
        songs: [],
        likes: 0,
        subscribers: 0,
      }

      const mockCreated = {
        id: 'new-album',
        ...newAlbum,
        created_at: '2024-01-01T00:00:00Z',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCreated,
      })

      const album = await albumsApi.create(newAlbum)
      expect(album.title).toBe('New Album')
      expect(mockFetch).toHaveBeenCalled()
      const callArgs = mockFetch.mock.calls[0]
      expect(callArgs[0]).toContain('/api/albums')
      expect(callArgs[1]?.method).toBe('POST')
      // Check body contains the album data
      const body = JSON.parse(callArgs[1]?.body as string)
      expect(body.title).toBe('New Album')
    })
  })

  describe('songsApi', () => {
    it('should create song with file upload', async () => {
      const file = new File(['audio content'], 'test.mp3', { type: 'audio/mpeg' })
      const newSong = {
        title: 'New Song',
        artist: 'New Artist',
        albumId: 'album1',
        tracks: [{ name: 'Vocals', file }],
      }

      const mockCreated = {
        id: 'new-song',
        title: 'New Song',
        artist: 'New Artist',
        album_id: 'album1',
        tracks: [
          {
            id: 'track1',
            name: 'Vocals',
            url: '/uploads/test.mp3',
            file_path: '/uploads/test.mp3',
            enabled: 1,
          },
        ],
        created_at: '2024-01-01T00:00:00Z',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCreated,
      })

      const song = await songsApi.create(newSong)
      expect(song.title).toBe('New Song')
      expect(song.tracks).toHaveLength(1)
      expect(mockFetch).toHaveBeenCalled()
      const callArgs = mockFetch.mock.calls[0]
      expect(callArgs[0]).toContain('/api/songs')
      expect(callArgs[1]?.method).toBe('POST')
    })

    it('should get song by id with tracks', async () => {
      const mockSong = {
        id: 'song1',
        title: 'Test Song',
        artist: 'Test Artist',
        album_id: 'album1',
        tracks: [
          {
            id: 'track1',
            name: 'Vocals',
            file_path: '/uploads/track1.mp3',
            enabled: 1,
          },
        ],
        created_at: '2024-01-01T00:00:00Z',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSong,
      })

      const song = await songsApi.getById('song1')
      expect(song.tracks).toHaveLength(1)
      expect(song.tracks[0].url).toContain('/uploads/track1.mp3')
    })
  })

  describe('subscriptionsApi', () => {
    it('should check subscription', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ isSubscribed: true }),
      })

      const isSubscribed = await subscriptionsApi.check('user1', 'artist1')
      expect(isSubscribed).toBe(true)
    })

    it('should subscribe to artist', async () => {
      const mockSubscription = {
        id: 'sub1',
        userId: 'user1',
        artistId: 'artist1',
        created_at: '2024-01-01T00:00:00Z',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSubscription,
      })

      const subscription = await subscriptionsApi.subscribe('user1', 'artist1')
      expect(subscription.userId).toBe('user1')
    })
  })

  describe('likesApi', () => {
    it('should get like count', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 10 }),
      })

      const count = await likesApi.getCount('song1')
      expect(count).toBe(10)
    })

    it('should toggle like', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ isLiked: true }),
      })

      const isLiked = await likesApi.toggle('user1', 'song1')
      expect(isLiked).toBe(true)
    })
  })

  describe('favoritesApi', () => {
    it('should get favorite count', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 5 }),
      })

      const count = await favoritesApi.getCount('song1')
      expect(count).toBe(5)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/favorites/song/song1/count'),
        expect.any(Object)
      )
    })

    it('should toggle favorite', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ isFavorited: true }),
      })

      const isFavorited = await favoritesApi.toggle('user1', 'song1')
      expect(isFavorited).toBe(true)
    })
  })
})

