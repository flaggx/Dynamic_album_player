import { useEffect, useRef, useState } from 'react'
import { usePlayer } from '../contexts/PlayerContext'
import './BottomPlayer.css'

const BottomPlayer = () => {
  const {
    currentSong,
    currentTracks,
    isPlaying,
    currentTime,
    duration,
    setIsPlaying,
    setCurrentTime,
    setDuration,
  } = usePlayer()

  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceNodesRef = useRef<Map<string, MediaElementAudioSourceNode>>(new Map())
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map())
  const gainNodesRef = useRef<Map<string, GainNode>>(new Map())
  const [trackStates, setTrackStates] = useState<Map<string, boolean>>(new Map())
  const [showTracksPanel, setShowTracksPanel] = useState(false)
  const tracksPanelRef = useRef<HTMLDivElement>(null)

  // Close tracks panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tracksPanelRef.current && !tracksPanelRef.current.contains(event.target as Node)) {
        const button = document.querySelector('.player-tracks-btn')
        if (button && !button.contains(event.target as Node)) {
          setShowTracksPanel(false)
        }
      }
    }

    if (showTracksPanel) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showTracksPanel])

  // Initialize tracks
  useEffect(() => {
    if (currentTracks.length === 0) {
      // Cleanup
      audioElementsRef.current.forEach((audio) => {
        audio.pause()
        audio.src = ''
      })
      sourceNodesRef.current.clear()
      audioElementsRef.current.clear()
      gainNodesRef.current.clear()
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }
      return
    }

    // Initialize AudioContext
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextClass()
    }

    // Initialize audio elements for each track
    currentTracks.forEach((track) => {
      if (audioElementsRef.current.has(track.id)) return

      const audio = new Audio(track.url || '')
      audio.loop = true
      audio.preload = 'auto'

      const source = audioContextRef.current!.createMediaElementSource(audio)
      const gainNode = audioContextRef.current!.createGain()

      source.connect(gainNode)
      gainNode.connect(audioContextRef.current!.destination)

      gainNode.gain.value = track.enabled ? 1 : 0

      audioElementsRef.current.set(track.id, audio)
      sourceNodesRef.current.set(track.id, source)
      gainNodesRef.current.set(track.id, gainNode)

      setTrackStates(prev => new Map(prev).set(track.id, track.enabled))

      // Update duration when metadata loads
      audio.addEventListener('loadedmetadata', () => {
        if (duration === 0 || audio.duration > duration) {
          setDuration(audio.duration)
        }
      })

      // Sync time updates
      audio.addEventListener('timeupdate', () => {
        if (track.id === currentTracks[0]?.id) {
          setCurrentTime(audio.currentTime)
        }
      })
    })

    return () => {
      // Don't cleanup on unmount, keep audio context alive
    }
  }, [currentTracks, duration, setCurrentTime, setDuration])

  // Handle play/pause
  useEffect(() => {
    if (currentTracks.length === 0) return

    const togglePlayPause = async () => {
      if (!audioContextRef.current) return

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume()
      }

      if (isPlaying) {
        audioElementsRef.current.forEach((audio) => {
          audio.currentTime = currentTime
          audio.play().catch(console.error)
        })
      } else {
        audioElementsRef.current.forEach((audio) => audio.pause())
      }
    }

    togglePlayPause()
  }, [isPlaying, currentTime, currentTracks])

  const handlePlayPause = async () => {
    if (!audioContextRef.current) return

    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume()
    }

    if (isPlaying) {
      audioElementsRef.current.forEach((audio) => audio.pause())
      setIsPlaying(false)
    } else {
      audioElementsRef.current.forEach((audio) => {
        audio.currentTime = currentTime
        audio.play().catch(console.error)
      })
      setIsPlaying(true)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value)
    setCurrentTime(newTime)
    audioElementsRef.current.forEach((audio) => {
      audio.currentTime = newTime
    })
  }

  const toggleTrack = (trackId: string) => {
    const gainNode = gainNodesRef.current.get(trackId)
    const newState = !(trackStates.get(trackId) ?? true)
    
    if (gainNode) {
      gainNode.gain.value = newState ? 1 : 0
    }
    
    setTrackStates(prev => new Map(prev).set(trackId, newState))
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!currentSong) {
    return null
  }

  return (
    <div className="bottom-player">
      <div className="player-left">
        {currentSong.coverImage ? (
          <img src={currentSong.coverImage} alt={currentSong.title} className="player-album-art" />
        ) : (
          <div className="player-album-art-placeholder">🎵</div>
        )}
        <div className="player-song-info">
          <div className="player-song-title">{currentSong.title}</div>
          <div className="player-song-artist">{currentSong.artist}</div>
        </div>
      </div>

      <div className="player-center">
        <div className="player-controls">
          <button className="player-control-btn" onClick={handlePlayPause}>
            {isPlaying ? '⏸' : '▶'}
          </button>
        </div>
        <div className="player-progress">
          <span className="player-time">{formatTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="player-progress-bar"
          />
          <span className="player-time">{formatTime(duration)}</span>
        </div>
      </div>

      <div className="player-right">
        <div className="player-tracks-toggle">
          <button 
            className="player-tracks-btn" 
            title="Toggle tracks"
            onClick={() => setShowTracksPanel(!showTracksPanel)}
          >
            🎛️
          </button>
        </div>
      </div>

      {/* Tracks panel (expandable) */}
      {showTracksPanel && (
        <div className="player-tracks-panel" ref={tracksPanelRef}>
        <div className="tracks-panel-header">
          <h3>Track Controls</h3>
        </div>
        <div className="tracks-panel-list">
          {currentTracks.map((track) => (
            <label key={track.id} className="track-toggle-item">
              <input
                type="checkbox"
                checked={trackStates.get(track.id) ?? track.enabled}
                onChange={() => toggleTrack(track.id)}
              />
              <span>{track.name}</span>
            </label>
          ))}
        </div>
        </div>
      )}
    </div>
  )
}

export default BottomPlayer

