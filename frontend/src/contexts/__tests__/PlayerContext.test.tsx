import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { PlayerProvider, usePlayer } from '../PlayerContext'
import { render } from '../../test/utils'
import { Song, Track } from '../../types'

const TestComponent = () => {
  const { currentSong, setCurrentSong } = usePlayer()
  return (
    <div>
      <button onClick={() => setCurrentSong({
        id: 'song1',
        title: 'Test Song',
        artist: 'Test Artist',
        albumId: 'album1',
        tracks: [],
        createdAt: '2024-01-01T00:00:00Z',
        likes: 0,
        favorites: 0,
      })}>
        Set Song
      </button>
      <div data-testid="current-song">{currentSong?.title || 'No song'}</div>
    </div>
  )
}

describe('PlayerContext', () => {
  it('should provide player context', () => {
    const { result } = renderHook(() => usePlayer(), {
      wrapper: ({ children }) => (
        <PlayerProvider>{children}</PlayerProvider>
      ),
    })

    expect(result.current.currentSong).toBeNull()
    expect(result.current.isPlaying).toBe(false)
  })

  it('should set current song', () => {
    const { result } = renderHook(() => usePlayer(), {
      wrapper: ({ children }) => (
        <PlayerProvider>{children}</PlayerProvider>
      ),
    })

    const testSong: Song = {
      id: 'song1',
      title: 'Test Song',
      artist: 'Test Artist',
      albumId: 'album1',
      tracks: [],
      createdAt: '2024-01-01T00:00:00Z',
      likes: 0,
      favorites: 0,
    }

    act(() => {
      result.current.setCurrentSong(testSong)
    })

    expect(result.current.currentSong).toEqual(testSong)
  })

  it('should update tracks when song changes', () => {
    const { result } = renderHook(() => usePlayer(), {
      wrapper: ({ children }) => (
        <PlayerProvider>{children}</PlayerProvider>
      ),
    })

    const tracks: Track[] = [
      {
        id: 'track1',
        name: 'Vocals',
        url: '/uploads/vocals.mp3',
        enabled: true,
      },
    ]

    const testSong: Song = {
      id: 'song1',
      title: 'Test Song',
      artist: 'Test Artist',
      albumId: 'album1',
      tracks,
      createdAt: '2024-01-01T00:00:00Z',
      likes: 0,
      favorites: 0,
    }

    act(() => {
      result.current.setCurrentSong(testSong)
    })

    expect(result.current.currentTracks).toEqual(tracks)
  })
})

