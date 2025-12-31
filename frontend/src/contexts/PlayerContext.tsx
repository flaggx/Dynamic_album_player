import { createContext, useContext, useState, ReactNode } from 'react'
import { Song, Track } from '../types'

interface PlayerContextType {
  currentSong: Song | null
  currentTracks: Track[]
  isPlaying: boolean
  currentTime: number
  duration: number
  setCurrentSong: (song: Song | null) => void
  setIsPlaying: (playing: boolean) => void
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined)

export const usePlayer = () => {
  const context = useContext(PlayerContext)
  if (context === undefined) {
    throw new Error('usePlayer must be used within a PlayerProvider')
  }
  return context
}

interface PlayerProviderProps {
  children: ReactNode
}

export const PlayerProvider = ({ children }: PlayerProviderProps) => {
  const [currentSong, setCurrentSong] = useState<Song | null>(null)
  const [currentTracks, setCurrentTracks] = useState<Track[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const handleSetCurrentSong = (song: Song | null) => {
    setCurrentSong(song)
    if (song) {
      setCurrentTracks(song.tracks)
    } else {
      setCurrentTracks([])
    }
  }

  return (
    <PlayerContext.Provider
      value={{
        currentSong,
        currentTracks,
        isPlaying,
        currentTime,
        duration,
        setCurrentSong: handleSetCurrentSong,
        setIsPlaying,
        setCurrentTime,
        setDuration,
      }}
    >
      {children}
    </PlayerContext.Provider>
  )
}

