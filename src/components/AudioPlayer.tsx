import { useState, useEffect, useRef } from 'react'
import './AudioPlayer.css'

interface Track {
  id: string
  name: string
  url: string
  enabled: boolean
}

interface AudioPlayerProps {
  tracks?: Track[]
}

const AudioPlayer = ({ tracks: initialTracks }: AudioPlayerProps) => {
  // Example tracks - in production, these would come from props or API
  const defaultTracks: Track[] = [
    { id: 'vocals', name: 'Vocals', url: '', enabled: true },
    { id: 'drums', name: 'Drums', url: '', enabled: true },
    { id: 'bass', name: 'Bass', url: '', enabled: true },
    { id: 'guitar', name: 'Guitar', url: '', enabled: true },
    { id: 'keys', name: 'Keys', url: '', enabled: true },
  ]

  const [tracks, setTracks] = useState<Track[]>(initialTracks || defaultTracks)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceNodesRef = useRef<Map<string, MediaElementAudioSourceNode>>(new Map())
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map())
  const gainNodesRef = useRef<Map<string, GainNode>>(new Map())

  useEffect(() => {
    // Update tracks when props change
    if (initialTracks) {
      setTracks(initialTracks)
    }
  }, [initialTracks])

  useEffect(() => {
    if (tracks.length === 0) return
    
    // Initialize AudioContext
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextClass()
    }

    // Initialize audio elements and audio graph for each track
    const currentTracks = tracks
    currentTracks.forEach((track) => {
      // Skip if already initialized
      if (audioElementsRef.current.has(track.id)) return
      
      const audio = new Audio(track.url || '')
      audio.loop = true
      audio.preload = 'auto'
      
      const source = audioContextRef.current!.createMediaElementSource(audio)
      const gainNode = audioContextRef.current!.createGain()
      
      source.connect(gainNode)
      gainNode.connect(audioContextRef.current!.destination)
      
      // Set initial gain based on enabled state
      gainNode.gain.value = track.enabled ? 1 : 0
      
      audioElementsRef.current.set(track.id, audio)
      sourceNodesRef.current.set(track.id, source)
      gainNodesRef.current.set(track.id, gainNode)

      // Update duration when metadata loads
      audio.addEventListener('loadedmetadata', () => {
        setDuration((prevDuration) => {
          if (prevDuration === 0) {
            return audio.duration
          }
          return prevDuration
        })
      })

      // Sync time updates
      audio.addEventListener('timeupdate', () => {
        if (track.id === currentTracks[0]?.id) {
          setCurrentTime(audio.currentTime)
        }
      })
    })

    // Capture refs for cleanup
    const audioElements = audioElementsRef.current
    const sourceNodes = sourceNodesRef.current
    const gainNodes = gainNodesRef.current
    const audioContext = audioContextRef.current

    return () => {
      // Cleanup
      audioElements.forEach((audio) => {
        audio.pause()
        audio.src = ''
      })
      sourceNodes.clear()
      audioElements.clear()
      gainNodes.clear()
      if (audioContext) {
        audioContext.close()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks])

  const toggleTrack = (trackId: string) => {
    setTracks((prevTracks) => {
      const updatedTracks = prevTracks.map((track) =>
        track.id === trackId ? { ...track, enabled: !track.enabled } : track
      )
      
      // Update gain node
      const gainNode = gainNodesRef.current.get(trackId)
      const track = updatedTracks.find((t) => t.id === trackId)
      if (gainNode && track) {
        gainNode.gain.value = track.enabled ? 1 : 0
      }
      
      return updatedTracks
    })
  }

  const togglePlayPause = async () => {
    if (!audioContextRef.current) return

    // Resume AudioContext if suspended (required for autoplay policies)
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume()
    }

    if (isPlaying) {
      audioElementsRef.current.forEach((audio) => audio.pause())
      setIsPlaying(false)
    } else {
      audioElementsRef.current.forEach((audio) => {
        audio.currentTime = currentTime
        audio.play()
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

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="audio-player">
      <div className="player-controls">
        <button className="play-pause-btn" onClick={togglePlayPause}>
          {isPlaying ? '⏸' : '▶'}
        </button>
        <div className="progress-container">
          <span className="time">{formatTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="progress-bar"
          />
          <span className="time">{formatTime(duration)}</span>
        </div>
      </div>

      <div className="tracks-list">
        <h2>Tracks</h2>
        {tracks.map((track) => (
          <div key={track.id} className="track-item">
            <label className="track-toggle">
              <input
                type="checkbox"
                checked={track.enabled}
                onChange={() => toggleTrack(track.id)}
              />
              <span className="track-name">{track.name}</span>
            </label>
          </div>
        ))}
      </div>

      {tracks.length === 0 && (
        <div className="info-box">
          <p>💡 No tracks available. Select a song to play.</p>
        </div>
      )}
    </div>
  )
}

export default AudioPlayer

