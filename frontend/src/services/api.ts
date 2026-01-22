import type { Session } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'
import {
  Album,
  Song,
  Track,
  Subscription,
  Like,
  Favorite,
  User,
  PremiumStatus,
  SongwritingSong,
} from '../types'
import { getSupabase } from '../lib/supabase'

let getAccessToken: (() => Promise<string | undefined>) | null = null

export const setAuthTokenGetter = (getter: () => Promise<string | undefined>) => {
  getAccessToken = getter
}

function sb() {
  const c = getSupabase()
  if (!c) throw new Error('Supabase is not configured')
  return c
}

async function sessionOrThrow(): Promise<Session> {
  const { data, error } = await sb().auth.getSession()
  if (error || !data.session) throw new Error('Authentication required')
  return data.session
}

function isAdminFromSession(s: Session): boolean {
  const meta = s.user.app_metadata || {}
  const roles = meta.roles
  if (Array.isArray(roles)) {
    return roles.some(
      (r) => typeof r === 'string' && (r.toLowerCase() === 'admin' || r.toLowerCase() === 'administrator')
    )
  }
  const role = meta.role
  return typeof role === 'string' && (role.toLowerCase() === 'admin' || role.toLowerCase() === 'administrator')
}

async function isPremiumOrAdmin(s: Session): Promise<boolean> {
  if (isAdminFromSession(s)) return true
  const uid = s.user.id
  const { data } = await sb()
    .from('users')
    .select('subscription_status, subscription_tier')
    .eq('id', uid)
    .maybeSingle()
  if (!data) return false
  return data.subscription_status === 'active' && data.subscription_tier === 'premium'
}

/** Optional origin for rows that still store Express paths like `/uploads/…` (no trailing slash). */
function legacyUploadsUrl(relativePath: string): string {
  const base = (process.env.NEXT_PUBLIC_LEGACY_UPLOADS_BASE_URL || '').replace(/\/$/, '')
  if (!base) return relativePath
  return `${base}${relativePath.startsWith('/') ? relativePath : `/${relativePath}`}`
}

function coverUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined
  if (path.startsWith('http')) return path
  if (path.startsWith('/uploads/')) return legacyUploadsUrl(path)
  const { data } = sb().storage.from('covers').getPublicUrl(path)
  return data.publicUrl
}

function trackUrl(path: string | null | undefined): string {
  if (!path) return ''
  if (path.startsWith('http')) return path
  if (path.startsWith('/uploads/')) return legacyUploadsUrl(path)
  const { data } = sb().storage.from('tracks').getPublicUrl(path)
  return data.publicUrl
}

const SONG_ID_IN_CHUNK = 400

async function likeFavoriteCountsBySongIds(songIds: string[]): Promise<{
  likes: Map<string, number>
  favorites: Map<string, number>
}> {
  const likes = new Map<string, number>()
  const favorites = new Map<string, number>()
  for (const id of songIds) {
    likes.set(id, 0)
    favorites.set(id, 0)
  }
  if (!songIds.length) return { likes, favorites }

  for (let i = 0; i < songIds.length; i += SONG_ID_IN_CHUNK) {
    const chunk = songIds.slice(i, i + SONG_ID_IN_CHUNK)
    const [lr, fr] = await Promise.all([
      sb().from('likes').select('song_id').in('song_id', chunk),
      sb().from('favorites').select('song_id').in('song_id', chunk),
    ])
    if (lr.error) throw new Error(lr.error.message)
    if (fr.error) throw new Error(fr.error.message)
    for (const row of lr.data || []) {
      const sid = row.song_id as string
      likes.set(sid, (likes.get(sid) || 0) + 1)
    }
    for (const row of fr.data || []) {
      const sid = row.song_id as string
      favorites.set(sid, (favorites.get(sid) || 0) + 1)
    }
  }
  return { likes, favorites }
}

function mapSongFromRow(
  row: {
    id: string
    title: string
    artist: string
    album_id: string
    duration?: number | null
    cover_image?: string | null
    created_at?: string | null
  },
  tracks: Track[],
  likeCount: number,
  favCount: number
): Song {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    albumId: row.album_id,
    tracks,
    duration: row.duration ?? undefined,
    coverImage: coverUrl(row.cover_image ?? undefined),
    createdAt: row.created_at || '',
    likes: likeCount,
    favorites: favCount,
  }
}

function isSupabaseStorageObjectKey(p: string): boolean {
  return Boolean(p) && !p.startsWith('http') && !p.startsWith('/uploads/')
}

async function removeStorageKeys(bucket: 'covers' | 'tracks', keys: string[]): Promise<void> {
  const uniq = [...new Set(keys.filter(isSupabaseStorageObjectKey))]
  const BATCH = 50
  for (let i = 0; i < uniq.length; i += BATCH) {
    const slice = uniq.slice(i, i + BATCH)
    const { error } = await sb().storage.from(bucket).remove(slice)
    if (error) console.warn(`[api] storage.${bucket}.remove:`, error.message)
  }
}

/** Best-effort: remove album cover, song covers, and track files from Storage before DB delete. */
async function deleteStorageForAlbum(albumId: string): Promise<void> {
  const coverKeys: string[] = []
  const trackKeys: string[] = []
  const { data: album } = await sb().from('albums').select('cover_image').eq('id', albumId).maybeSingle()
  if (album?.cover_image) coverKeys.push(album.cover_image as string)
  const { data: songs } = await sb().from('songs').select('id, cover_image').eq('album_id', albumId)
  const songIds = (songs || []).map((s) => s.id as string)
  for (const s of songs || []) {
    if (s.cover_image) coverKeys.push(s.cover_image as string)
  }
  if (songIds.length) {
    const { data: trks } = await sb().from('tracks').select('file_path').in('song_id', songIds)
    for (const t of trks || []) {
      if (t.file_path) trackKeys.push(t.file_path as string)
    }
  }
  await removeStorageKeys('covers', coverKeys)
  await removeStorageKeys('tracks', trackKeys)
}

async function deleteStorageForSong(songId: string): Promise<void> {
  const coverKeys: string[] = []
  const trackKeys: string[] = []
  const { data: song } = await sb().from('songs').select('cover_image').eq('id', songId).maybeSingle()
  if (song?.cover_image) coverKeys.push(song.cover_image as string)
  const { data: trks } = await sb().from('tracks').select('file_path').eq('song_id', songId)
  for (const t of trks || []) {
    if (t.file_path) trackKeys.push(t.file_path as string)
  }
  await removeStorageKeys('covers', coverKeys)
  await removeStorageKeys('tracks', trackKeys)
}

async function premiumFetch(path: string, init?: RequestInit) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string>),
  }
  if (getAccessToken) {
    const t = await getAccessToken()
    if (t) headers.Authorization = `Bearer ${t}`
  }
  const res = await fetch(path, { ...init, headers, credentials: 'include' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error?: string }).error || res.statusText)
  }
  return res.json()
}

export const albumsApi = {
  getAll: async (search?: string): Promise<Album[]> => {
    const { data: albums, error } = await sb()
      .from('albums')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    const needle = search?.trim().toLowerCase()
    const list = needle
      ? (albums || []).filter(
          (a) =>
            String(a.title || '').toLowerCase().includes(needle) ||
            String(a.artist || '').toLowerCase().includes(needle) ||
            String(a.description || '').toLowerCase().includes(needle)
        )
      : albums || []
    const out: Album[] = []
    for (const a of list) {
      const id = a.id as string
      const { count: subc } = await sb()
        .from('subscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('artist_id', a.artist_id as string)
      const { data: songIds } = await sb().from('songs').select('id').eq('album_id', id)
      const ids = (songIds || []).map((r) => r.id)
      let likeCount = 0
      if (ids.length) {
        const { count } = await sb().from('likes').select('id', { count: 'exact', head: true }).in('song_id', ids)
        likeCount = count || 0
      }
      out.push({
        id,
        title: a.title as string,
        artist: a.artist as string,
        artistId: a.artist_id as string,
        description: (a.description as string) || undefined,
        coverImage: coverUrl(a.cover_image as string | null),
        songs: [],
        createdAt: (a.created_at as string) || '',
        updatedAt: (a.updated_at as string) || '',
        likes: likeCount,
        subscribers: subc || 0,
      })
    }
    return out
  },

  getById: async (id: string): Promise<Album> => {
    const { data: a, error } = await sb().from('albums').select('*').eq('id', id).maybeSingle()
    if (error) throw new Error(error.message)
    if (!a) throw new Error('Album not found')
    const { data: songs } = await sb().from('songs').select('id').eq('album_id', id)
    const { count: subc } = await sb()
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('artist_id', a.artist_id as string)
    const ids = (songs || []).map((r) => r.id)
    let likeCount = 0
    if (ids.length) {
      const { count } = await sb().from('likes').select('id', { count: 'exact', head: true }).in('song_id', ids)
      likeCount = count || 0
    }
    return {
      id: a.id as string,
      title: a.title as string,
      artist: a.artist as string,
      artistId: a.artist_id as string,
      description: (a.description as string) || undefined,
      coverImage: coverUrl(a.cover_image as string | null),
      songs: (songs || []).map((s) => ({ id: s.id as string })) as unknown as Song[],
      createdAt: (a.created_at as string) || '',
      updatedAt: (a.updated_at as string) || '',
      likes: likeCount,
      subscribers: subc || 0,
    }
  },

  getByArtist: async (artistId: string): Promise<Album[]> => {
    const { data: rows, error } = await sb()
      .from('albums')
      .select('*')
      .eq('artist_id', artistId)
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    const out: Album[] = []
    for (const r of rows || []) {
      const { count: subc } = await sb()
        .from('subscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('artist_id', artistId)
      const { data: songIds } = await sb().from('songs').select('id').eq('album_id', r.id as string)
      const ids = (songIds || []).map((x) => x.id)
      let likeCount = 0
      if (ids.length) {
        const { count } = await sb().from('likes').select('id', { count: 'exact', head: true }).in('song_id', ids)
        likeCount = count || 0
      }
      out.push({
        id: r.id as string,
        title: r.title as string,
        artist: r.artist as string,
        artistId: r.artist_id as string,
        description: (r.description as string) || undefined,
        coverImage: coverUrl(r.cover_image as string | null),
        songs: [],
        createdAt: (r.created_at as string) || '',
        updatedAt: (r.updated_at as string) || '',
        likes: likeCount,
        subscribers: subc || 0,
      })
    }
    return out
  },

  create: async (album: Omit<Album, 'id' | 'createdAt' | 'updatedAt'> & { coverImageFile?: File }): Promise<Album> => {
    const s = await sessionOrThrow()
    if (!(await isPremiumOrAdmin(s))) throw new Error('Premium subscription required')
    const uid = s.user.id
    const id = uuidv4()
    let coverPath: string | null = null
    if (album.coverImageFile) {
      const ext = album.coverImageFile.name.includes('.') ? album.coverImageFile.name.split('.').pop() : 'jpg'
      coverPath = `${uid}/${id}.${ext}`
      const { error: upErr } = await sb().storage.from('covers').upload(coverPath, album.coverImageFile, {
        upsert: true,
        contentType: album.coverImageFile.type || undefined,
      })
      if (upErr) throw new Error(upErr.message)
    }
    const { error } = await sb().from('albums').insert({
      id,
      title: album.title,
      artist: album.artist,
      artist_id: uid,
      description: album.description ?? null,
      cover_image: coverPath,
    })
    if (error) throw new Error(error.message)
    const { data: row } = await sb().from('albums').select('*').eq('id', id).single()
    return {
      id,
      title: album.title,
      artist: album.artist,
      artistId: uid,
      description: album.description,
      coverImage: coverUrl(row?.cover_image as string | null),
      songs: [],
      createdAt: (row?.created_at as string) || new Date().toISOString(),
      updatedAt: (row?.updated_at as string) || new Date().toISOString(),
      likes: 0,
      subscribers: 0,
    }
  },

  update: async (id: string, updates: Partial<Album>): Promise<Album> => {
    await sessionOrThrow()
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (updates.title != null) patch.title = updates.title
    if (updates.description !== undefined) patch.description = updates.description
    const { error } = await sb().from('albums').update(patch).eq('id', id)
    if (error) throw new Error(error.message)
    return albumsApi.getById(id)
  },

  delete: async (id: string): Promise<void> => {
    await sessionOrThrow()
    await deleteStorageForAlbum(id)
    const { error } = await sb().from('albums').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },
}

export const songsApi = {
  getAll: async (): Promise<Song[]> => {
    const { data: songs, error } = await sb().from('songs').select('*').order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    const list = songs || []
    const ids = list.map((s) => s.id as string)
    const { likes, favorites } = await likeFavoriteCountsBySongIds(ids)
    return list.map((song) => {
      const id = song.id as string
      return mapSongFromRow(
        {
          id,
          title: song.title as string,
          artist: song.artist as string,
          album_id: song.album_id as string,
          duration: song.duration as number | null | undefined,
          cover_image: song.cover_image as string | null | undefined,
          created_at: song.created_at as string | null | undefined,
        },
        [],
        likes.get(id) || 0,
        favorites.get(id) || 0
      )
    })
  },

  getById: async (id: string): Promise<Song> => {
    const { data: song, error } = await sb().from('songs').select('*').eq('id', id).maybeSingle()
    if (error) throw new Error(error.message)
    if (!song) throw new Error('Song not found')
    const { data: tracks } = await sb().from('tracks').select('*').eq('song_id', id)
    const { likes, favorites } = await likeFavoriteCountsBySongIds([id])
    return mapSongFromRow(
      {
        id: song.id as string,
        title: song.title as string,
        artist: song.artist as string,
        album_id: song.album_id as string,
        duration: song.duration as number | null | undefined,
        cover_image: song.cover_image as string | null | undefined,
        created_at: song.created_at as string | null | undefined,
      },
      (tracks || []).map((t) => ({
        id: t.id as string,
        name: t.name as string,
        url: trackUrl(t.file_path as string),
        enabled: Boolean(t.enabled),
      })),
      likes.get(id) || 0,
      favorites.get(id) || 0
    )
  },

  getByAlbum: async (albumId: string): Promise<Song[]> => {
    const { data: songs, error } = await sb().from('songs').select('*').eq('album_id', albumId).order('created_at')
    if (error) throw new Error(error.message)
    const list = songs || []
    const ids = list.map((s) => s.id as string)
    const { likes, favorites } = await likeFavoriteCountsBySongIds(ids)
    const tracksBySong = new Map<string, Track[]>()
    if (ids.length) {
      const { data: allTracks, error: te } = await sb().from('tracks').select('*').in('song_id', ids)
      if (te) throw new Error(te.message)
      for (const t of allTracks || []) {
        const sid = t.song_id as string
        const arr = tracksBySong.get(sid) || []
        arr.push({
          id: t.id as string,
          name: t.name as string,
          url: trackUrl(t.file_path as string),
          enabled: Boolean(t.enabled),
        })
        tracksBySong.set(sid, arr)
      }
    }
    return list.map((song) => {
      const id = song.id as string
      return mapSongFromRow(
        {
          id,
          title: song.title as string,
          artist: song.artist as string,
          album_id: song.album_id as string,
          duration: song.duration as number | null | undefined,
          cover_image: song.cover_image as string | null | undefined,
          created_at: song.created_at as string | null | undefined,
        },
        tracksBySong.get(id) || [],
        likes.get(id) || 0,
        favorites.get(id) || 0
      )
    })
  },

  create: async (song: {
    title: string
    artist: string
    albumId: string
    tracks: Array<{ name: string; file: File }>
  }): Promise<Song> => {
    const s = await sessionOrThrow()
    if (!(await isPremiumOrAdmin(s))) throw new Error('Premium subscription required')
    const uid = s.user.id
    const songId = uuidv4()
    const { error: insSong } = await sb()
      .from('songs')
      .insert({
        id: songId,
        title: song.title,
        artist: song.artist,
        album_id: song.albumId,
      })
    if (insSong) throw new Error(insSong.message)
    const tracks: Track[] = []
    for (let i = 0; i < song.tracks.length; i++) {
      const tr = song.tracks[i]
      const tid = uuidv4()
      const ext = tr.file.name.includes('.') ? tr.file.name.substring(tr.file.name.lastIndexOf('.')) : '.mp3'
      const path = `${uid}/${songId}/${tid}${ext}`
      const { error: up } = await sb().storage.from('tracks').upload(path, tr.file, {
        contentType: tr.file.type || undefined,
      })
      if (up) throw new Error(up.message)
      const { error: insT } = await sb().from('tracks').insert({
        id: tid,
        song_id: songId,
        name: tr.name,
        file_path: path,
        enabled: true,
      })
      if (insT) throw new Error(insT.message)
      tracks.push({ id: tid, name: tr.name, url: trackUrl(path), enabled: true })
    }
    return {
      id: songId,
      title: song.title,
      artist: song.artist,
      albumId: song.albumId,
      tracks,
      createdAt: new Date().toISOString(),
      likes: 0,
      favorites: 0,
    }
  },

  update: async (id: string, updates: Partial<Song>): Promise<Song> => {
    await sessionOrThrow()
    const patch: Record<string, unknown> = {}
    if (updates.title != null) patch.title = updates.title
    if (updates.artist != null) patch.artist = updates.artist
    if (updates.duration != null) patch.duration = updates.duration
    if (Object.keys(patch).length) {
      const { error } = await sb().from('songs').update(patch).eq('id', id)
      if (error) throw new Error(error.message)
    }
    if (updates.tracks) {
      for (const t of updates.tracks) {
        if (t.id) {
          await sb().from('tracks').update({ name: t.name, enabled: t.enabled }).eq('id', t.id)
        }
      }
    }
    return songsApi.getById(id)
  },

  delete: async (id: string): Promise<void> => {
    await sessionOrThrow()
    await deleteStorageForSong(id)
    const { error } = await sb().from('songs').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },
}

export const usersApi = {
  getById: async (id: string): Promise<User> => {
    const { data: u, error } = await sb().from('users').select('*').eq('id', id).maybeSingle()
    if (error) throw new Error(error.message)
    if (!u) throw new Error('User not found')
    const { data: sess } = await sb().auth.getSession()
    const viewer = sess.session?.user.id
    const base: User = {
      id: u.id as string,
      email: u.email as string,
      name: (u.name as string) || undefined,
      picture: (u.picture as string) || undefined,
      bio: (u.bio as string) || undefined,
      createdAt: (u.created_at as string) || '',
    }
    if (viewer === id) return { ...base, isAdmin: u.is_admin === true }
    return base
  },

  createOrUpdate: async (user: Omit<User, 'createdAt'>): Promise<User> => {
    const s = await sessionOrThrow()
    if (user.id !== s.user.id) throw new Error('Forbidden')
    const { error } = await sb().from('users').upsert(
      {
        id: user.id,
        email: user.email,
        name: user.name ?? null,
        picture: user.picture ?? null,
        bio: user.bio ?? null,
      },
      { onConflict: 'id' }
    )
    if (error) throw new Error(error.message)
    return usersApi.getById(user.id)
  },
}

export const subscriptionsApi = {
  getUserSubscriptions: async (userId: string): Promise<Subscription[]> => {
    const s = await sessionOrThrow()
    if (s.user.id !== userId) throw new Error('Unauthorized')
    const { data, error } = await sb().from('subscriptions').select('*').eq('user_id', userId)
    if (error) throw new Error(error.message)
    return (data || []).map((r) => ({
      id: r.id as string,
      userId: r.user_id as string,
      artistId: r.artist_id as string,
      createdAt: (r.created_at as string) || '',
    }))
  },

  check: async (userId: string, artistId: string): Promise<boolean> => {
    const { data } = await sb()
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('artist_id', artistId)
      .maybeSingle()
    return !!data
  },

  subscribe: async (_userId: string, artistId: string): Promise<Subscription> => {
    const s = await sessionOrThrow()
    const uid = s.user.id
    if (uid === artistId) throw new Error('Cannot subscribe to yourself')
    const { data: ex } = await sb()
      .from('subscriptions')
      .select('*')
      .eq('user_id', uid)
      .eq('artist_id', artistId)
      .maybeSingle()
    if (ex) {
      return {
        id: ex.id as string,
        userId: uid,
        artistId,
        createdAt: (ex.created_at as string) || '',
      }
    }
    const id = uuidv4()
    const { error } = await sb().from('subscriptions').insert({ id, user_id: uid, artist_id: artistId })
    if (error) throw new Error(error.message)
    return { id, userId: uid, artistId, createdAt: new Date().toISOString() }
  },

  unsubscribe: async (_userId: string, artistId: string): Promise<void> => {
    const s = await sessionOrThrow()
    const { error } = await sb()
      .from('subscriptions')
      .delete()
      .eq('user_id', s.user.id)
      .eq('artist_id', artistId)
    if (error) throw new Error(error.message)
  },

  getSubscriberCount: async (artistId: string): Promise<number> => {
    const { count, error } = await sb()
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('artist_id', artistId)
    if (error) throw new Error(error.message)
    return count || 0
  },
}

export const likesApi = {
  getCount: async (songId: string): Promise<number> => {
    const { count, error } = await sb().from('likes').select('id', { count: 'exact', head: true }).eq('song_id', songId)
    if (error) throw new Error(error.message)
    return count || 0
  },

  check: async (userId: string, songId: string): Promise<boolean> => {
    const { data } = await sb().from('likes').select('id').eq('user_id', userId).eq('song_id', songId).maybeSingle()
    return !!data
  },

  toggle: async (_userId: string, songId: string): Promise<boolean> => {
    const s = await sessionOrThrow()
    const uid = s.user.id
    const { data: ex } = await sb().from('likes').select('id').eq('user_id', uid).eq('song_id', songId).maybeSingle()
    if (ex) {
      const { error } = await sb().from('likes').delete().eq('user_id', uid).eq('song_id', songId)
      if (error) throw new Error(error.message)
      return false
    }
    const { error } = await sb().from('likes').insert({ id: uuidv4(), user_id: uid, song_id: songId })
    if (error) throw new Error(error.message)
    return true
  },
}

export const favoritesApi = {
  getUserFavorites: async (userId: string): Promise<Favorite[]> => {
    const s = await sessionOrThrow()
    if (s.user.id !== userId) throw new Error('Unauthorized')
    const { data, error } = await sb()
      .from('favorites')
      .select('*, songs(title, artist, album_id)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data || []).map((f) => ({
      id: f.id as string,
      userId: f.user_id as string,
      songId: f.song_id as string,
      createdAt: (f.created_at as string) || '',
    }))
  },

  getCount: async (songId: string): Promise<number> => {
    const { count, error } = await sb()
      .from('favorites')
      .select('id', { count: 'exact', head: true })
      .eq('song_id', songId)
    if (error) throw new Error(error.message)
    return count || 0
  },

  check: async (userId: string, songId: string): Promise<boolean> => {
    const { data } = await sb().from('favorites').select('id').eq('user_id', userId).eq('song_id', songId).maybeSingle()
    return !!data
  },

  toggle: async (_userId: string, songId: string): Promise<boolean> => {
    const s = await sessionOrThrow()
    const uid = s.user.id
    const { data: ex } = await sb()
      .from('favorites')
      .select('id')
      .eq('user_id', uid)
      .eq('song_id', songId)
      .maybeSingle()
    if (ex) {
      const { error } = await sb().from('favorites').delete().eq('user_id', uid).eq('song_id', songId)
      if (error) throw new Error(error.message)
      return false
    }
    const { error } = await sb().from('favorites').insert({ id: uuidv4(), user_id: uid, song_id: songId })
    if (error) throw new Error(error.message)
    return true
  },
}

export interface BannedUser {
  id: string
  email: string
  name: string
  banned_reason?: string
  banned_at?: string
}

async function requireAdmin(): Promise<Session> {
  const s = await sessionOrThrow()
  if (!isAdminFromSession(s)) throw new Error('Admin access required')
  return s
}

export const adminApi = {
  deleteAlbum: async (albumId: string): Promise<void> => {
    await requireAdmin()
    await deleteStorageForAlbum(albumId)
    const { error } = await sb().from('albums').delete().eq('id', albumId)
    if (error) throw new Error(error.message)
  },

  deleteSong: async (songId: string): Promise<void> => {
    await requireAdmin()
    await deleteStorageForSong(songId)
    const { error } = await sb().from('songs').delete().eq('id', songId)
    if (error) throw new Error(error.message)
  },

  banUser: async (userId: string, reason?: string): Promise<{ message: string; user: unknown }> => {
    await requireAdmin()
    const { data, error } = await sb()
      .from('users')
      .update({
        banned: true,
        banned_reason: reason || 'Violation of terms of service',
        banned_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return { message: 'User banned successfully', user: data }
  },

  unbanUser: async (userId: string): Promise<{ message: string; user: unknown }> => {
    await requireAdmin()
    const { data, error } = await sb()
      .from('users')
      .update({ banned: false, banned_reason: null, banned_at: null })
      .eq('id', userId)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return { message: 'User unbanned successfully', user: data }
  },

  getBannedUsers: async (): Promise<BannedUser[]> => {
    await requireAdmin()
    const { data, error } = await sb()
      .from('users')
      .select('id, email, name, banned_reason, banned_at')
      .eq('banned', true)
    if (error) throw new Error(error.message)
    return (data || []) as BannedUser[]
  },

  getAllUsers: async (): Promise<unknown[]> => {
    await requireAdmin()
    const { data, error } = await sb()
      .from('users')
      .select('id, email, name, banned, banned_reason, banned_at, created_at')
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return data || []
  },

  deleteUser: async (userId: string): Promise<void> => {
    await requireAdmin()
    const { data: albumRows } = await sb().from('albums').select('id').eq('artist_id', userId)
    for (const row of albumRows || []) {
      await deleteStorageForAlbum(row.id as string)
    }
    await sb().from('albums').delete().eq('artist_id', userId)
    const { error } = await sb().from('users').delete().eq('id', userId)
    if (error) throw new Error(error.message)
  },
}

export const premiumApi = {
  getStatus: async (): Promise<PremiumStatus> => {
    const s = await sessionOrThrow()
    const jwtAdmin = isAdminFromSession(s)
    if (jwtAdmin) {
      return {
        isPremium: true,
        subscriptionStatus: 'active',
        subscriptionTier: 'premium',
        subscriptionEndsAt: null,
        stripeCustomerId: null,
      }
    }
    const { data: u } = await sb()
      .from('users')
      .select('*')
      .eq('id', s.user.id)
      .maybeSingle()
    if (!u) {
      return {
        isPremium: jwtAdmin,
        subscriptionStatus: jwtAdmin ? 'active' : 'free',
        subscriptionTier: jwtAdmin ? 'premium' : 'free',
        subscriptionEndsAt: null,
        stripeCustomerId: null,
      }
    }
    const prem = u.subscription_status === 'active' && u.subscription_tier === 'premium'
    return {
      isPremium: prem || jwtAdmin,
      subscriptionStatus: (u.subscription_status as PremiumStatus['subscriptionStatus']) || 'free',
      subscriptionTier: (u.subscription_tier as PremiumStatus['subscriptionTier']) || 'free',
      subscriptionEndsAt: u.subscription_ends_at ? String(u.subscription_ends_at) : null,
      stripeCustomerId: (u.stripe_customer_id as string) || null,
    }
  },

  createCheckoutSession: async (returnTo?: string) => {
    return premiumFetch('/api/premium/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify({ returnTo }),
    }) as Promise<{ sessionId: string; url: string }>
  },

  createPortalSession: async () => {
    return premiumFetch('/api/premium/create-portal-session', { method: 'POST' }) as Promise<{ url: string }>
  },

  cancel: async () => {
    return premiumFetch('/api/premium/cancel', { method: 'POST' }) as Promise<{ message: string }>
  },
}

function mapSongwritingRow(r: Record<string, unknown>): SongwritingSong {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    title: r.title as string,
    authorFirstName: (r.author_first_name as string) || '',
    authorLastName: (r.author_last_name as string) || '',
    key: r.key as string,
    timeSignature: (r.time_signature as SongwritingSong['timeSignature']) || '4/4',
    chordProgression: r.chord_progression ? (JSON.parse(String(r.chord_progression)) as string[]) : null,
    structure: JSON.parse(String(r.structure)) as SongwritingSong['structure'],
    isPublic: Boolean(r.is_public),
    createdAt: (r.created_at as string) || '',
    updatedAt: (r.updated_at as string) || '',
  }
}

export const songwritingApi = {
  getAll: async (): Promise<SongwritingSong[]> => {
    await sessionOrThrow()
    const { data, error } = await sb()
      .from('songwriting_songs')
      .select('*')
      .order('updated_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data || []).map((r) => mapSongwritingRow(r as Record<string, unknown>))
  },

  getById: async (id: string): Promise<SongwritingSong> => {
    await sessionOrThrow()
    const { data, error } = await sb().from('songwriting_songs').select('*').eq('id', id).maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) throw new Error('Song not found')
    return mapSongwritingRow(data as Record<string, unknown>)
  },

  create: async (song: Omit<SongwritingSong, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<SongwritingSong> => {
    const s = await sessionOrThrow()
    if (!(await isPremiumOrAdmin(s))) throw new Error('Premium subscription required')
    const id = uuidv4()
    const now = new Date().toISOString()
    const { error } = await sb().from('songwriting_songs').insert({
      id,
      user_id: s.user.id,
      title: song.title,
      author_first_name: song.authorFirstName,
      author_last_name: song.authorLastName,
      key: song.key,
      time_signature: song.timeSignature,
      chord_progression: song.chordProgression ? JSON.stringify(song.chordProgression) : null,
      structure: JSON.stringify(song.structure),
      is_public: song.isPublic,
      created_at: now,
      updated_at: now,
    })
    if (error) throw new Error(error.message)
    return songwritingApi.getById(id)
  },

  update: async (id: string, updates: Partial<SongwritingSong>): Promise<SongwritingSong> => {
    await sessionOrThrow()
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (updates.title != null) patch.title = updates.title
    if (updates.authorFirstName != null) patch.author_first_name = updates.authorFirstName
    if (updates.authorLastName != null) patch.author_last_name = updates.authorLastName
    if (updates.key != null) patch.key = updates.key
    if (updates.timeSignature != null) patch.time_signature = updates.timeSignature
    if (updates.chordProgression !== undefined)
      patch.chord_progression = updates.chordProgression ? JSON.stringify(updates.chordProgression) : null
    if (updates.structure != null) patch.structure = JSON.stringify(updates.structure)
    if (updates.isPublic != null) patch.is_public = updates.isPublic
    const { error } = await sb().from('songwriting_songs').update(patch).eq('id', id)
    if (error) throw new Error(error.message)
    return songwritingApi.getById(id)
  },

  delete: async (id: string): Promise<void> => {
    await sessionOrThrow()
    const { error } = await sb().from('songwriting_songs').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },
}
