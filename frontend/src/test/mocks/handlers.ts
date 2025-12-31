import { http, HttpResponse } from 'msw'

const API_URL = 'http://localhost:3001'

export const handlers = [
  // Albums
  http.get(`${API_URL}/api/albums`, () => {
    return HttpResponse.json([
      {
        id: 'album1',
        title: 'Test Album',
        artist: 'Test Artist',
        artistId: 'user1',
        description: 'Test description',
        songs: ['song1'],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        likes: 0,
        subscribers: 0,
      },
    ])
  }),

  http.get(`${API_URL}/api/albums/:id`, ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      title: 'Test Album',
      artist: 'Test Artist',
      artistId: 'user1',
      description: 'Test description',
      songs: ['song1'],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      likes: 0,
      subscribers: 0,
    })
  }),

  http.post(`${API_URL}/api/albums`, async ({ request }) => {
    const body = await request.json() as any
    return HttpResponse.json({
      id: 'new-album-id',
      ...body,
      songs: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      likes: 0,
      subscribers: 0,
    }, { status: 201 })
  }),

  // Songs
  http.get(`${API_URL}/api/songs`, () => {
    return HttpResponse.json([
      {
        id: 'song1',
        title: 'Test Song',
        artist: 'Test Artist',
        album_id: 'album1',
        created_at: '2024-01-01T00:00:00Z',
      },
    ])
  }),

  http.get(`${API_URL}/api/songs/:id`, ({ params }) => {
    return HttpResponse.json({
      id: params.id,
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
    })
  }),

  http.get(`${API_URL}/api/songs/album/:albumId`, ({ params }) => {
    return HttpResponse.json([
      {
        id: 'song1',
        title: 'Test Song',
        artist: 'Test Artist',
        album_id: params.albumId,
        created_at: '2024-01-01T00:00:00Z',
      },
    ])
  }),

  http.post(`${API_URL}/api/songs`, async ({ request }) => {
    const formData = await request.formData()
    return HttpResponse.json({
      id: 'new-song-id',
      title: formData.get('title') as string,
      artist: formData.get('artist') as string,
      album_id: formData.get('albumId') as string,
      tracks: [
        {
          id: 'track1',
          name: 'Track 1',
          url: '/uploads/test.mp3',
          enabled: true,
        },
      ],
      created_at: new Date().toISOString(),
    }, { status: 201 })
  }),

  // Users
  http.get(`${API_URL}/api/users/:id`, ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://example.com/pic.jpg',
      created_at: '2024-01-01T00:00:00Z',
    })
  }),

  http.post(`${API_URL}/api/users`, async ({ request }) => {
    const body = await request.json() as any
    return HttpResponse.json({
      ...body,
      created_at: new Date().toISOString(),
    }, { status: 201 })
  }),

  // Subscriptions
  http.get(`${API_URL}/api/subscriptions/user/:userId`, () => {
    return HttpResponse.json([])
  }),

  http.get(`${API_URL}/api/subscriptions/check/:userId/:artistId`, ({ params }) => {
    return HttpResponse.json({
      isSubscribed: params.userId === 'user1' && params.artistId === 'artist1',
    })
  }),

  http.post(`${API_URL}/api/subscriptions`, async ({ request }) => {
    const body = await request.json() as any
    return HttpResponse.json({
      id: 'sub1',
      ...body,
      created_at: new Date().toISOString(),
    }, { status: 201 })
  }),

  http.delete(`${API_URL}/api/subscriptions/:userId/:artistId`, () => {
    return HttpResponse.json(null, { status: 204 })
  }),

  // Likes
  http.get(`${API_URL}/api/likes/song/:songId/count`, () => {
    return HttpResponse.json({ count: 5 })
  }),

  http.get(`${API_URL}/api/likes/check/:userId/:songId`, ({ params }) => {
    return HttpResponse.json({
      isLiked: params.userId === 'user1' && params.songId === 'song1',
    })
  }),

  http.post(`${API_URL}/api/likes/toggle`, async ({ request }) => {
    const body = await request.json() as any
    return HttpResponse.json({
      isLiked: true,
    })
  }),

  // Favorites
  http.get(`${API_URL}/api/favorites/user/:userId`, () => {
    return HttpResponse.json([])
  }),

  http.get(`${API_URL}/api/favorites/song/:songId/count`, () => {
    return HttpResponse.json({ count: 3 })
  }),

  http.get(`${API_URL}/api/favorites/check/:userId/:songId`, ({ params }) => {
    return HttpResponse.json({
      isFavorited: params.userId === 'user1' && params.songId === 'song1',
    })
  }),

  http.post(`${API_URL}/api/favorites/toggle`, async ({ request }) => {
    return HttpResponse.json({
      isFavorited: true,
    })
  }),
]

