import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, Link, useSearchParams } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import toast from 'react-hot-toast'
import { songwritingApi, premiumApi } from '../services/api'
import { SongwritingSong, SongSection, SongSectionType, PremiumStatus, Bar } from '../types'
import { useIsAdmin } from '../utils/admin'
import { MUSICAL_KEYS, ROMAN_NUMERALS, getChordFromProgression, getChordVoicings, generateChordTab, formatChordName } from '../utils/chords'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'
import LoadingSpinner from '../components/LoadingSpinner'
import TimelineEditor from '../components/TimelineEditor'
import NodeBasedCanvas from '../components/NodeBasedCanvas'
import { SongNode } from '../types'
import './Songwriting.css'
import { v4 as uuidv4 } from 'uuid'

// Calculate beats per bar from time signature
const getBeatsPerBar = (timeSignature: '4/4' | '6/8' | '3/4' | '2/4'): number => {
  switch (timeSignature) {
    case '4/4': return 4
    case '6/8': return 6
    case '3/4': return 3
    case '2/4': return 2
    default: return 4
  }
}

// Common chord progressions
const CHORD_PROGRESSIONS: Array<{ name: string; progression: string[] }> = [
  { name: 'I - IV - V - vi (Pop)', progression: ['I', 'IV', 'V', 'vi'] },
  { name: 'ii - IV - V - iii', progression: ['ii', 'IV', 'V', 'iii'] },
  { name: 'I - V - vi - IV (Pop)', progression: ['I', 'V', 'vi', 'IV'] },
  { name: 'vi - IV - I - V (Pop)', progression: ['vi', 'IV', 'I', 'V'] },
  { name: 'I - vi - IV - V (50s)', progression: ['I', 'vi', 'IV', 'V'] },
  { name: 'I - IV - I - V', progression: ['I', 'IV', 'I', 'V'] },
  { name: 'I - vi - ii - V (Jazz)', progression: ['I', 'vi', 'ii', 'V'] },
  { name: 'ii - V - I (Jazz)', progression: ['ii', 'V', 'I'] },
  { name: 'I - IV - vi - V', progression: ['I', 'IV', 'vi', 'V'] },
  { name: 'I - iii - IV - V', progression: ['I', 'iii', 'IV', 'V'] },
  { name: 'I - vi - iii - IV', progression: ['I', 'vi', 'iii', 'IV'] },
  { name: 'vi - I - V - IV', progression: ['vi', 'I', 'V', 'IV'] },
  { name: 'I - V - vi - iii - IV - I - IV - V', progression: ['I', 'V', 'vi', 'iii', 'IV', 'I', 'IV', 'V'] },
  { name: 'I - bVII - IV - I', progression: ['I', 'bVII', 'IV', 'I'] },
  { name: 'Custom', progression: [] }, // Placeholder for custom
]

// Bar Block Component - Each bar is a visual rectangle
interface BarBlockProps {
  barNumber: number
  beatsPerBar: number
  tempo: number
  text: string
  chords: Array<{ position: number; chord: string; voicing?: string }> // Position is relative to bar start
  barStartPosition: number // For display/calculation purposes only
  onTextChange: (text: string) => void
  onAddChord: (relativePosition: number, chord: string) => void // Position is relative to bar start
  onMoveChord: (oldPosition: number, newPosition: number) => void // Move chord to new position
  onRemoveBar: () => void // Remove this bar
  availableChords: string[]
  songKey: string
  onChordHover: (chord: string, voicing: string, x: number, y: number) => void
  onChordLeave: () => void
}

// Metronome utility
let audioContext: AudioContext | null = null
let metronomeInterval: number | null = null
let currentBarId: string | null = null

const getAudioContext = async (): Promise<AudioContext> => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  // Resume context if suspended (required after user interaction)
  if (audioContext.state === 'suspended') {
    await audioContext.resume()
  }
  return audioContext
}

const playMetronomeClick = async (isFirstBeat: boolean = false) => {
  try {
    const ctx = await getAudioContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    
    // Higher pitch for first beat, lower for others
    oscillator.frequency.value = isFirstBeat ? 800 : 600
    oscillator.type = 'sine'
    
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)
    
    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.1)
  } catch (error) {
    console.error('Error playing metronome click:', error)
  }
}

let currentOnComplete: (() => void) | null = null
let currentBeatUpdate: ((beat: number) => void) | null = null

const startMetronome = (
  tempo: number,
  beatsPerBar: number, 
  barId: string, 
  onBeatUpdate: (beat: number) => void,
  onComplete?: () => void
) => {
  // Stop any existing metronome
  if (metronomeInterval !== null) {
    clearInterval(metronomeInterval)
    metronomeInterval = null
  }
  
  // Call previous onComplete if it exists
  if (currentOnComplete) {
    currentOnComplete()
  }
  
  currentBarId = barId
  currentOnComplete = onComplete || null
  currentBeatUpdate = onBeatUpdate
  const beatDuration = 60000 / tempo // milliseconds per beat
  
  // Store beatsPerBar in closure to ensure it's correct
  const beatsPerBarValue = beatsPerBar
  let beatCount = 0
  
  // Play first beat immediately
  playMetronomeClick(true)
  if (currentBeatUpdate) {
    currentBeatUpdate(0) // Total beat count starts at 0
  }
  beatCount = 1
  
  metronomeInterval = window.setInterval(() => {
    const currentBeat = beatCount % beatsPerBarValue
    const isFirstBeat = currentBeat === 0
    
    playMetronomeClick(isFirstBeat)
    if (currentBeatUpdate) {
      currentBeatUpdate(beatCount) // Pass total beat count, not just beat in bar
    }
    beatCount++
  }, beatDuration)
}

const stopMetronome = () => {
  if (metronomeInterval !== null) {
    clearInterval(metronomeInterval)
    metronomeInterval = null
  }
  if (currentOnComplete) {
    currentOnComplete()
    currentOnComplete = null
  }
  if (currentBeatUpdate) {
    currentBeatUpdate(-1) // Reset beat indicator
    currentBeatUpdate = null
  }
  currentBarId = null
}

const BarBlock = ({
  barNumber,
  beatsPerBar,
  tempo,
  text,
  chords,
  barStartPosition,
  onTextChange,
  onAddChord,
  onMoveChord,
  onRemoveBar,
  availableChords,
  songKey,
  onChordHover,
  onChordLeave,
}: BarBlockProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [selectedChord, setSelectedChord] = useState('')
  const [cursorPosition, setCursorPosition] = useState(0)
  const [isDragOver, setIsDragOver] = useState(false)
  const [chordLineDragOver, setChordLineDragOver] = useState(false)
  const [draggedChordPosition, setDraggedChordPosition] = useState<number | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentBeat, setCurrentBeat] = useState<number>(-1)
  const barIdRef = useRef(`bar-${barNumber}-${Date.now()}`)
  
  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (currentBarId === barIdRef.current) {
        stopMetronome()
      }
    }
  }, [])
  
  const handleMetronomePlay = () => {
    if (isPlaying) {
      // Stop if already playing
      if (currentBarId === barIdRef.current) {
        stopMetronome()
        setIsPlaying(false)
        setCurrentBeat(-1)
      }
    } else {
      // Start playing
      setIsPlaying(true)
      startMetronome(
        tempo,
        beatsPerBar, 
        barIdRef.current, 
        (beat: number) => {
          if (currentBarId === barIdRef.current) {
            setCurrentBeat(beat)
          }
        },
        () => {
          setIsPlaying(false)
          setCurrentBeat(-1)
        }
      )
    }
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value
    onTextChange(newText)
    setCursorPosition(e.target.selectionStart)
  }

  const handleChordSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value && cursorPosition >= 0) {
      const actualChord = getChordFromProgression(songKey, e.target.value)
      onAddChord(cursorPosition, actualChord) // Pass relative position
      setSelectedChord('')
      e.target.value = ''
    }
  }

  const handleTextClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget
    // Use setTimeout to ensure selectionStart is updated after click
    setTimeout(() => {
      setCursorPosition(textarea.selectionStart)
    }, 0)
  }
  
  const handleTextFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget
    setCursorPosition(textarea.selectionStart)
  }

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    
    // Try to get chord from dataTransfer
    let chord: string | null = null
    
    // Try JSON first
    const chordData = e.dataTransfer.getData('application/json')
    if (chordData) {
      try {
        const parsed = JSON.parse(chordData)
        chord = parsed.chord
      } catch (error) {
        console.error('Error parsing chord data:', error)
      }
    }
    
    // Fallback to text/plain
    if (!chord) {
      chord = e.dataTransfer.getData('text/plain')
    }
    
    if (chord) {
      const actualChord = getChordFromProgression(songKey, chord)
      const textarea = textareaRef.current
      
      if (textarea) {
        // Use the textarea's current cursor position or selection
        // This is more accurate than trying to calculate from mouse coordinates
        const dropPosition = textarea.selectionStart || cursorPosition
        
        // If there's a selection, use the start of the selection
        if (textarea.selectionStart !== textarea.selectionEnd) {
          // User has text selected, place chord at start of selection
          onAddChord(textarea.selectionStart, actualChord)
        } else {
          // No selection, use cursor position
          onAddChord(dropPosition, actualChord)
        }
        
        toast.success(`Added ${formatChordName(actualChord)}`)
      } else {
        // Fallback: add at cursor position
        onAddChord(cursorPosition, actualChord)
        toast.success(`Added ${formatChordName(actualChord)}`)
      }
    }
  }

  // Chords are already relative to bar start
  const barChords = [...chords].sort((a, b) => a.position - b.position)

  return (
    <div className="bar-block">
      <div className="bar-block-header">
        <span className="bar-number-label">Bar {barNumber}</span>
        <div className="beat-indicators-row">
          {Array.from({ length: beatsPerBar }).map((_, beatIdx) => (
            <div
              key={beatIdx}
              className={`beat-indicator-dot ${currentBeat === beatIdx ? 'active' : ''} ${isPlaying ? 'visible' : ''}`}
              title={`Beat ${beatIdx + 1}`}
            >
              {beatIdx + 1}
            </div>
          ))}
        </div>
        <div className="bar-header-actions">
          <button
            className={`metronome-play-btn ${isPlaying ? 'playing' : ''}`}
            onClick={handleMetronomePlay}
            title={isPlaying ? 'Stop metronome' : 'Play metronome for this bar'}
          >
            {isPlaying ? (
              <span className="metronome-icon-stop">⏸</span>
            ) : (
              <span className="metronome-icon-play">▶</span>
            )}
          </button>
          <button
            className="bar-delete-btn"
            onClick={onRemoveBar}
            title="Delete this bar"
          >
            <span className="delete-icon"></span>
          </button>
        </div>
      </div>
      <div className="bar-block-content">
        {/* Chord line above text - draggable target */}
        <div 
          className={`bar-chord-line ${chordLineDragOver ? 'drag-over' : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setChordLineDragOver(true)
          }}
          onDragLeave={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setChordLineDragOver(false)
          }}
          onDrop={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setChordLineDragOver(false)
            
            // Check if this is a chord being moved
            const chordData = e.dataTransfer.getData('application/json')
            if (chordData) {
              try {
                const parsed = JSON.parse(chordData)
                if (parsed.type === 'move-chord') {
                  // Moving an existing chord
                  const chordLine = e.currentTarget
                  const rect = chordLine.getBoundingClientRect()
                  const x = e.clientX - rect.left
                  
                  // Estimate character position (monospace font, ~8px per char)
                  const charWidth = 8
                  const newPos = Math.max(0, Math.min(text.length, Math.floor(x / charWidth)))
                  
                  onMoveChord(parsed.position, newPos)
                  setDraggedChordPosition(null)
                  return
                } else if (parsed.chord) {
                  // Adding a new chord from progression
                  const actualChord = getChordFromProgression(songKey, parsed.chord)
                  const chordLine = e.currentTarget
                  const rect = chordLine.getBoundingClientRect()
                  const x = e.clientX - rect.left
                  
                  const charWidth = 8
                  const estimatedPos = Math.max(0, Math.min(text.length, Math.floor(x / charWidth)))
                  
                  onAddChord(estimatedPos, actualChord)
                  toast.success(`Added ${formatChordName(actualChord)}`)
                  return
                }
              } catch (error) {
                console.error('Error parsing chord data:', error)
              }
            }
            
            // Fallback: try text/plain
            const chord = e.dataTransfer.getData('text/plain')
            if (chord) {
              const actualChord = getChordFromProgression(songKey, chord)
              const chordLine = e.currentTarget
              const rect = chordLine.getBoundingClientRect()
              const x = e.clientX - rect.left
              
              const charWidth = 8
              const estimatedPos = Math.max(0, Math.min(text.length, Math.floor(x / charWidth)))
              
              onAddChord(estimatedPos, actualChord)
              toast.success(`Added ${formatChordName(actualChord)}`)
            }
          }}
        >
          {barChords.length > 0 ? (
            barChords.map((chordData, idx) => {
              const voicings = getChordVoicings(chordData.chord)
              const voicing = voicings.find(v => v.name === chordData.voicing) || voicings[0]
              const prevChord = barChords[idx - 1]
              const spacing = idx === 0 
                ? `${chordData.position}ch` 
                : `${chordData.position - (prevChord?.position || 0) + (formatChordName(prevChord?.chord || '').length || 0)}ch`
              const isDragging = draggedChordPosition === chordData.position
              return (
                <span
                  key={idx}
                  className={`bar-chord-mark ${isDragging ? 'dragging' : ''}`}
                  style={{ marginLeft: spacing }}
                  draggable
                  onDragStart={(e) => {
                    setDraggedChordPosition(chordData.position)
                    e.dataTransfer.effectAllowed = 'move'
                    e.dataTransfer.setData('application/json', JSON.stringify({ 
                      type: 'move-chord',
                      position: chordData.position 
                    }))
                    if (e.currentTarget instanceof HTMLElement) {
                      e.currentTarget.style.opacity = '0.5'
                    }
                  }}
                  onDragEnd={(e) => {
                    setDraggedChordPosition(null)
                    if (e.currentTarget instanceof HTMLElement) {
                      e.currentTarget.style.opacity = '1'
                    }
                  }}
                  onMouseEnter={(e) => {
                    if (voicing) {
                      onChordHover(chordData.chord, chordData.voicing || 'Open', e.clientX, e.clientY)
                    }
                  }}
                  onMouseLeave={onChordLeave}
                >
                  {formatChordName(chordData.chord)}
                  {chordData.voicing && chordData.voicing !== 'Open' && (
                    <span className="voicing-label">{chordData.voicing}</span>
                  )}
                </span>
              )
            })
          ) : (
            <span className="chord-line-placeholder">Drop chords here</span>
          )}
        </div>
        {/* Text input */}
        <div className="bar-text-wrapper">
          <textarea
            ref={textareaRef}
            className="bar-text-input"
            value={text}
            onChange={handleTextChange}
            onClick={handleTextClick}
            onFocus={handleTextFocus}
            onSelect={(e) => {
              const target = e.target as HTMLTextAreaElement
              setCursorPosition(target.selectionStart)
            }}
            onKeyUp={(e) => {
              const target = e.target as HTMLTextAreaElement
              setCursorPosition(target.selectionStart)
            }}
            placeholder={`Enter lyrics for bar ${barNumber}...`}
            rows={2}
            spellCheck={false}
          />
          {/* Beat dividers */}
          <div className="bar-beat-dividers">
            {Array.from({ length: beatsPerBar }).map((_, beatIdx) => (
              <div
                key={beatIdx}
                className={`beat-divider ${currentBeat === beatIdx ? 'active' : ''}`}
                style={{ left: `${(beatIdx + 1) * (100 / beatsPerBar)}%` }}
              >
                {currentBeat === beatIdx && (
                  <div className="beat-indicator">
                    <div className="beat-indicator-pulse"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="bar-block-footer">
        <select
          className="bar-chord-selector"
          value={selectedChord}
          onChange={handleChordSelect}
        >
          <option value="">Add chord at cursor...</option>
          {availableChords.map((chord) => {
            const actualChord = getChordFromProgression(songKey, chord)
            return (
              <option key={chord} value={chord}>
                {chord} ({formatChordName(actualChord)})
              </option>
            )
          })}
        </select>
      </div>
    </div>
  )
}

// Rendered Song View Component - Improved preview
interface RenderedSongViewProps {
  title: string
  authorFirstName: string
  authorLastName: string
  key: string
  timeSignature: '4/4' | '6/8' | '3/4' | '2/4'
  tempo: number
  chordProgression: string[] | null
  structure: SongSection[]
  createdAt: string
  onEdit: () => void
}

const RenderedSongView = ({
  title,
  authorFirstName,
  authorLastName,
  key: songKey,
  timeSignature,
  tempo,
  chordProgression,
  structure,
  createdAt,
  onEdit,
}: RenderedSongViewProps) => {
  const copyrightYear = createdAt ? new Date(createdAt).getFullYear() : new Date().getFullYear()
  const authorName = `${authorFirstName || ''} ${authorLastName || ''}`.trim() || 'Unknown Author'

  const safeStructure = structure || []
  const safeKey = songKey || 'C'
  const safeTimeSignature = timeSignature || '4/4'
  const safeTitle = title || 'Untitled Song'

  const beatsPerBar = getBeatsPerBar(safeTimeSignature)

  // Get bars from section (convert from lyrics if needed for backward compatibility)
  // Only splits at explicit newlines - no automatic splitting
  const getBarsFromSection = (section: SongSection): Bar[] => {
    if (section.bars && section.bars.length > 0) {
      return section.bars
    }
    
    // Backward compatibility: convert lyrics to bars (only split at newlines)
    const bars: Bar[] = []
    const lyrics = section.lyrics || ''
    const chords = section.chords || []
    
    // If lyrics is empty, create one empty bar
    if (!lyrics || lyrics.trim() === '') {
      bars.push({
        id: `bar-${section.id}-1`,
        barNumber: 1,
        text: '',
        chords: [],
      })
      return bars
    }
    
    // Split only at newlines - each line becomes a bar
    const lines = lyrics.split('\n')
    let absolutePosition = 0
    
    lines.forEach((line, lineIndex) => {
      const lineStart = absolutePosition
      const lineEnd = absolutePosition + line.length
      const lineChords = chords
        .filter(c => c.position >= lineStart && c.position < lineEnd)
        .map(c => ({ ...c, position: c.position - lineStart }))
      
      bars.push({
        id: `bar-${section.id}-${lineIndex + 1}`,
        barNumber: lineIndex + 1,
        text: line,
        chords: lineChords,
      })
      
      absolutePosition = lineEnd + 1 // +1 for the newline character
    })

    return bars
  }

  return (
    <div className="rendered-song-view">
      <div className="rendered-song-header">
        <h1>{safeTitle}</h1>
        <div className="song-metadata">
          <span>Key: {formatChordName(safeKey)}</span>
          <span>Time: {safeTimeSignature}</span>
          <span>Tempo: {tempo} BPM</span>
        </div>
        <button className="edit-button" onClick={onEdit}>
          <span className="edit-icon"></span>
          Edit
        </button>
      </div>

      <div className="rendered-song-content">
        {safeStructure.length === 0 ? (
          <div className="empty-song-message">
            <p>No sections added yet. Switch to edit mode to add sections.</p>
          </div>
        ) : (
          safeStructure
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map((section) => {
              const sectionType = SECTION_TYPES.find(st => st.type === section.type)
              const bars = getBarsFromSection(section)

              // Combine all bars into one continuous text flow for Ultimate Guitar style
              // Only break at explicit newlines
              // Preserve bar boundaries - don't add spaces, just concatenate
              let combinedText = ''
              const combinedChords: Array<{ position: number; chord: string; voicing?: string }> = []
              let absolutePosition = 0
              
              bars.forEach((bar, barIndex) => {
                const barText = bar.text || ''
                const barStart = absolutePosition
                
                // Add bar text to combined text (preserve newlines)
                combinedText += barText
                
                // Add bar chords with absolute positions (relative to combined text)
                bar.chords.forEach(chord => {
                  combinedChords.push({
                    ...chord,
                    position: barStart + chord.position,
                  })
                })
                
                // Update absolute position to end of this bar's text
                // Don't add spaces - just track where we are
                absolutePosition = combinedText.length
                
                // Only add a newline between bars if the bar doesn't already end with one
                // and it's not the last bar
                if (barIndex < bars.length - 1 && barText && !barText.endsWith('\n')) {
                  combinedText += '\n'
                  absolutePosition = combinedText.length
                }
              })

              // Split combined text only at explicit newlines
              const lines = combinedText.split('\n')
              const allLines: Array<{ chords: Array<{ position: number; chord: string; voicing?: string }>; text: string }> = []
              
              let lineStartPos = 0
              lines.forEach((lineText) => {
                const lineEndPos = lineStartPos + lineText.length
                
                // Get chords for this line (convert to line-relative positions)
                const lineChords = combinedChords
                  .filter(c => c.position >= lineStartPos && c.position < lineEndPos)
                  .map(c => ({
                    ...c,
                    position: c.position - lineStartPos,
                  }))
                  .sort((a, b) => a.position - b.position)
                
                allLines.push({
                  chords: lineChords,
                  text: lineText.trim() || '\u00A0', // Use non-breaking space if empty
                })
                
                lineStartPos = lineEndPos + 1 // +1 for the newline
              })

              // Calculate chars per bar for DAW grid
              const charsPerBar = beatsPerBar * 4
              
              return (
                <div key={section.id} className="rendered-section">
                  <h3 className="section-label">[{sectionType?.label || section.type}]</h3>
                  <div 
                    className="rendered-lines-container"
                    style={{
                      '--chars-per-bar': String(charsPerBar),
                    } as React.CSSProperties}
                  >
                    {allLines.map((line, lineIdx) => {
                      // Build chord and lyrics with perfect character alignment
                      const text = line.text || ''
                      const chords = line.chords || []
                      
                      // Sort chords by position
                      const sortedChords = [...chords].sort((a, b) => a.position - b.position)
                      
                      // Build the chord line using the exact same text as spacing (invisible)
                      // This ensures both lines wrap identically
                      const chordLineElements: React.ReactNode[] = []
                      
                      // Start with the full text as invisible spacing
                      // Then overlay chords at their positions
                      let lastPos = 0
                      
                      sortedChords.forEach((chordData, chordIdx) => {
                        const chordPos = Math.min(chordData.position, text.length)
                        const chordName = formatChordName(chordData.chord)
                        
                        // Add invisible text from last position to chord position
                        if (chordPos > lastPos) {
                          const spacingText = text.substring(lastPos, chordPos)
                          chordLineElements.push(
                            <span key={`spacing-${chordIdx}`} className="rendered-spacing">
                              {spacingText}
                            </span>
                          )
                        }
                        
                        // Add the visible chord
                        chordLineElements.push(
                          <span key={`chord-${chordIdx}`} className="rendered-chord">
                            {chordName}
                          </span>
                        )
                        
                        lastPos = chordPos
                      })
                      
                      // Add remaining invisible text at the end
                      if (lastPos < text.length) {
                        const remainingText = text.substring(lastPos)
                        chordLineElements.push(
                          <span key="spacing-end" className="rendered-spacing">
                            {remainingText}
                          </span>
                        )
                      }
                      
                      // If no chords, still add invisible text to maintain structure
                      if (sortedChords.length === 0 && text.length > 0) {
                        chordLineElements.push(
                          <span key="spacing-full" className="rendered-spacing">
                            {text}
                          </span>
                        )
                      }
                      
                      return (
                        <div key={lineIdx} className="rendered-line">
                          {chordLineElements.length > 0 && (
                            <div className="rendered-chord-line">
                              {chordLineElements}
                            </div>
                          )}
                          <div className="rendered-lyrics-line">
                            {text}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
        )}
      </div>

      <div className="rendered-song-footer">
        <div className="copyright">
          © {copyrightYear} {authorName}. All rights reserved.
        </div>
      </div>
    </div>
  )
}

const SECTION_TYPES: { type: SongSectionType; label: string }[] = [
  { type: 'intro', label: 'Intro' },
  { type: 'verse', label: 'Verse' },
  { type: 'pre-chorus', label: 'Pre-Chorus' },
  { type: 'chorus', label: 'Chorus' },
  { type: 'bridge', label: 'Bridge' },
  { type: 'outro', label: 'Outro' },
]

const TIME_SIGNATURES: ('4/4' | '6/8' | '3/4' | '2/4')[] = ['4/4', '6/8', '3/4', '2/4']

const Songwriting = () => {
  const { user, isAuthenticated } = useAuth0()
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const isAdmin = useIsAdmin()
  
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatus | null>(null)
  const [isCheckingPremium, setIsCheckingPremium] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  const [title, setTitle] = useState('')
  const [authorFirstName, setAuthorFirstName] = useState('')
  const [authorLastName, setAuthorLastName] = useState('')
  const [key, setKey] = useState('C')
  const [timeSignature, setTimeSignature] = useState<'4/4' | '6/8' | '3/4' | '2/4'>('4/4')
  const [tempo, setTempo] = useState<number>(120)
  const [chordProgression, setChordProgression] = useState<string[]>(['I', 'IV', 'V', 'vi'])
  const [structure, setStructure] = useState<SongSection[]>([])
  const [nodes, setNodes] = useState<SongNode[]>([]) // Node-based system
  const [isPublic, setIsPublic] = useState(false)
  const [viewMode, setViewMode] = useState<'edit' | 'view'>('edit')
  const [showModeModal, setShowModeModal] = useState(false)
  const [hoveredChord, setHoveredChord] = useState<{ chord: string; voicing: string; x: number; y: number } | null>(null)
  
  // Metronome state
  const [isMetronomePlaying, setIsMetronomePlaying] = useState(false)
  const [currentBeat, setCurrentBeat] = useState<number>(-1)
  const [currentBar, setCurrentBar] = useState<number>(0)
  
  const [draggedSection, setDraggedSection] = useState<SongSection | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  
  const [savedSongs, setSavedSongs] = useState<SongwritingSong[]>([])
  const [hasDraft, setHasDraft] = useState(false)

  const DRAFT_STORAGE_KEY = 'songwriting_draft'
  const searchParams = useSearchParams()[0]
  const isPremium = premiumStatus?.isPremium || isAdmin

  // Helper: Convert lyrics string to bars array
  // Only splits at explicit newlines - no automatic splitting based on character count
  // Users control bar boundaries manually (words can be sung faster/slower to fill bars)
  const lyricsToBars = (lyrics: string, chords: Array<{ position: number; chord: string; voicing?: string }>, ts: '4/4' | '6/8' | '3/4' | '2/4' = timeSignature): Bar[] => {
    const bars: Bar[] = []
    
    // If lyrics is empty, create one empty bar
    if (!lyrics || lyrics.trim() === '') {
      bars.push({
        id: uuidv4(),
        barNumber: 1,
        text: '',
        chords: [],
      })
      return bars
    }
    
    // Split only at newlines - each line becomes a bar (or part of a bar)
    const lines = lyrics.split('\n')
    let currentBar = 1
    let absolutePosition = 0
    
    lines.forEach((line, lineIndex) => {
      // Get chords for this line (convert absolute positions to relative)
      const lineStart = absolutePosition
      const lineEnd = absolutePosition + line.length
      const lineChords = chords
        .filter(c => c.position >= lineStart && c.position < lineEnd)
        .map(c => ({ ...c, position: c.position - lineStart }))
      
      bars.push({
        id: uuidv4(),
        barNumber: currentBar,
        text: line,
        chords: lineChords,
      })
      
      absolutePosition = lineEnd + 1 // +1 for the newline character
      currentBar++
    })
    
    // If no bars were created (shouldn't happen, but safety check)
    if (bars.length === 0) {
      bars.push({
        id: uuidv4(),
        barNumber: 1,
        text: lyrics,
        chords: chords.map(c => ({ ...c, position: c.position })),
      })
    }

    return bars
  }

  // Helper: Convert bars array to lyrics string and chords array
  const barsToLyrics = (bars: Bar[]): { lyrics: string; chords: Array<{ position: number; chord: string; voicing?: string }> } => {
    let lyrics = ''
    const chords: Array<{ position: number; chord: string; voicing?: string }> = []
    let absolutePosition = 0

    bars.forEach((bar) => {
      // Add bar text to lyrics
      lyrics += bar.text
      
      // Convert relative chord positions to absolute positions
      bar.chords.forEach((chord) => {
        chords.push({
          ...chord,
          position: absolutePosition + chord.position,
        })
      })
      
      absolutePosition += bar.text.length
    })

    return { lyrics, chords }
  }

  // Helper: Convert timelineItems to lyrics/chords format for backward compatibility
  const timelineItemsToLyrics = (timelineItems: Array<{ startBeat: number; duration: number; content: string; type: string; voicing?: string }>, beatsPerBar: number): { lyrics: string; chords: Array<{ position: number; chord: string; voicing?: string }> } => {
    let lyrics = ''
    const chords: Array<{ position: number; chord: string; voicing?: string }> = []
    
    // Sort items by startBeat
    const sortedItems = [...timelineItems].sort((a, b) => a.startBeat - b.startBeat)
    
    // Convert beats to character positions (rough approximation: 4 characters per beat)
    sortedItems.forEach((item) => {
      const charPosition = item.startBeat * 4
      
      if (item.type === 'chord') {
        chords.push({
          position: charPosition,
          chord: item.content,
          voicing: item.voicing,
        })
      } else if (item.type === 'lyric') {
        // Pad lyrics to the right position
        while (lyrics.length < charPosition) {
          lyrics += ' '
        }
        lyrics += item.content + ' '
      }
    })
    
    return { lyrics: lyrics.trim(), chords }
  }

  // Ensure section has bars array (convert from lyrics if needed)
  const ensureSectionHasBars = (section: SongSection): SongSection => {
    if (section.bars && section.bars.length > 0) {
      return section
    }
    
    // Convert lyrics to bars
    const bars = lyricsToBars(section.lyrics || '', section.chords || [], timeSignature)
    return { ...section, bars }
  }

  // Add a new bar to a section
  const addBarToSection = (sectionId: string) => {
    const section = structure.find(s => s.id === sectionId)
    if (!section) {
      toast.error('Section not found')
      return
    }

    const sectionWithBars = ensureSectionHasBars(section)
    const newBar: Bar = {
      id: uuidv4(),
      barNumber: (sectionWithBars.bars?.length || 0) + 1,
      text: '',
      chords: [],
    }
    
    updateSection(sectionId, { bars: [...(sectionWithBars.bars || []), newBar] })
    toast.success('Bar added to section')
  }

  // Helper functions
  const addSection = (type: SongSectionType) => {
    const newSection: SongSection = {
      id: uuidv4(),
      type,
      order: structure.length,
      lyrics: '', // Will be generated from timelineItems when saving
      chords: [], // Will be generated from timelineItems when saving
      timelineItems: [], // Start with empty timeline
    }
    setStructure([...structure, newSection])
  }

  const updateSection = (sectionId: string, updates: Partial<SongSection>) => {
    setStructure(structure.map(s => {
      if (s.id === sectionId) {
        const updated = { ...s, ...updates }
        // If bars were updated, also update lyrics and chords for backward compatibility
        if (updates.bars) {
          const { lyrics, chords } = barsToLyrics(updates.bars)
          updated.lyrics = lyrics
          updated.chords = chords
        }
        return updated
      }
      return s
    }))
  }

  const deleteSection = (sectionId: string) => {
    if (window.confirm('Are you sure you want to delete this section?\n\n⚠️ WARNING: This action cannot be undone.')) {
      const section = structure.find(s => s.id === sectionId)
      setStructure(structure.filter(s => s.id !== sectionId).map((s, idx) => ({ ...s, order: idx })))
      toast.success(`${section?.type || 'Section'} deleted`)
    }
  }

  // Add chord to a specific bar in a section
  const addChordToBar = (sectionId: string, barId: string, position: number, chord: string) => {
    const section = structure.find(s => s.id === sectionId)
    if (!section) return

    const sectionWithBars = ensureSectionHasBars(section)
    const bars = sectionWithBars.bars || []
    const barIndex = bars.findIndex(b => b.id === barId)
    if (barIndex === -1) return

    const voicings = getChordVoicings(chord)
    const defaultVoicing = voicings[0]?.name || 'Open'

    const newChord = {
      position, // Position is relative to bar start
      chord,
      voicing: defaultVoicing,
    }

    const updatedBars = [...bars]
    updatedBars[barIndex] = {
      ...updatedBars[barIndex],
      chords: [...updatedBars[barIndex].chords, newChord].sort((a, b) => a.position - b.position),
    }

    updateSection(sectionId, { bars: updatedBars })
  }

  // Remove chord from a specific bar in a section
  const removeChordFromBar = (sectionId: string, barId: string, position: number) => {
    const section = structure.find(s => s.id === sectionId)
    if (!section) return

    const sectionWithBars = ensureSectionHasBars(section)
    const bars = sectionWithBars.bars || []
    const barIndex = bars.findIndex(b => b.id === barId)
    if (barIndex === -1) return

    const updatedBars = [...bars]
    updatedBars[barIndex] = {
      ...updatedBars[barIndex],
      chords: updatedBars[barIndex].chords.filter(c => c.position !== position),
    }

    updateSection(sectionId, { bars: updatedBars })
  }

  // Remove a bar from a section
  const removeBarFromSection = (sectionId: string, barId: string) => {
    const section = structure.find(s => s.id === sectionId)
    if (!section) return

    const sectionWithBars = ensureSectionHasBars(section)
    const bars = sectionWithBars.bars || []
    
    // Don't allow removing the last bar - at least one bar must exist
    if (bars.length <= 1) {
      toast.error('Cannot remove the last bar. A section must have at least one bar.')
      return
    }

    const updatedBars = bars.filter(b => b.id !== barId)
    
    // Renumber bars to maintain sequential order
    const renumberedBars = updatedBars.map((bar, index) => ({
      ...bar,
      barNumber: index + 1,
    }))

    updateSection(sectionId, { bars: renumberedBars })
  }

  // Move chord to a new position within a bar
  const moveChordInBar = (sectionId: string, barId: string, oldPosition: number, newPosition: number) => {
    const section = structure.find(s => s.id === sectionId)
    if (!section) return

    const sectionWithBars = ensureSectionHasBars(section)
    const bars = sectionWithBars.bars || []
    const barIndex = bars.findIndex(b => b.id === barId)
    if (barIndex === -1) return

    const updatedBars = [...bars]
    const bar = updatedBars[barIndex]
    const chordIndex = bar.chords.findIndex(c => c.position === oldPosition)
    
    if (chordIndex === -1) return

    const updatedChords = [...bar.chords]
    updatedChords[chordIndex] = {
      ...updatedChords[chordIndex],
      position: Math.max(0, Math.min(newPosition, bar.text.length)),
    }
    
    // Sort chords by position
    updatedChords.sort((a, b) => a.position - b.position)

    updatedBars[barIndex] = {
      ...bar,
      chords: updatedChords,
    }

    updateSection(sectionId, { bars: updatedBars })
  }

  // Update chord voicing in a specific bar
  const updateChordVoicingInBar = (sectionId: string, barId: string, position: number, voicing: string) => {
    const section = structure.find(s => s.id === sectionId)
    if (!section) return

    const sectionWithBars = ensureSectionHasBars(section)
    const bars = sectionWithBars.bars || []
    const barIndex = bars.findIndex(b => b.id === barId)
    if (barIndex === -1) return

    const updatedBars = [...bars]
    updatedBars[barIndex] = {
      ...updatedBars[barIndex],
      chords: updatedBars[barIndex].chords.map(c =>
        c.position === position ? { ...c, voicing } : c
      ),
    }

    updateSection(sectionId, { bars: updatedBars })
  }

  // Legacy functions for backward compatibility (convert to bar-based)
  const addChordToSection = (sectionId: string, position: number, chord: string) => {
    // This is called from BarBlock with absolute position
    // We need to find which bar this position belongs to
    const section = structure.find(s => s.id === sectionId)
    if (!section) return

    const sectionWithBars = ensureSectionHasBars(section)
    const bars = sectionWithBars.bars || []
    
    // Find which bar contains this position
    let currentPos = 0
    for (let i = 0; i < bars.length; i++) {
      const bar = bars[i]
      const barEnd = currentPos + bar.text.length
      
      if (position >= currentPos && position < barEnd) {
        // Position is within this bar
        const relativePos = position - currentPos
        addChordToBar(sectionId, bar.id, relativePos, chord)
        return
      }
      
      currentPos = barEnd
    }
    
    // If position is beyond all bars, add to last bar
    if (bars.length > 0) {
      const lastBar = bars[bars.length - 1]
      const relativePos = position - currentPos + lastBar.text.length
      addChordToBar(sectionId, lastBar.id, relativePos, chord)
    }
  }

  const removeChordFromSection = (sectionId: string, position: number) => {
    const section = structure.find(s => s.id === sectionId)
    if (!section) return

    const sectionWithBars = ensureSectionHasBars(section)
    const bars = sectionWithBars.bars || []
    
    // Find which bar contains this position
    let currentPos = 0
    for (let i = 0; i < bars.length; i++) {
      const bar = bars[i]
      const barEnd = currentPos + bar.text.length
      
      if (position >= currentPos && position < barEnd) {
        const relativePos = position - currentPos
        removeChordFromBar(sectionId, bar.id, relativePos)
        return
      }
      
      currentPos = barEnd
    }
  }

  const updateChordVoicing = (sectionId: string, position: number, voicing: string) => {
    const section = structure.find(s => s.id === sectionId)
    if (!section) return

    const sectionWithBars = ensureSectionHasBars(section)
    const bars = sectionWithBars.bars || []
    
    // Find which bar contains this position
    let currentPos = 0
    for (let i = 0; i < bars.length; i++) {
      const bar = bars[i]
      const barEnd = currentPos + bar.text.length
      
      if (position >= currentPos && position < barEnd) {
        const relativePos = position - currentPos
        updateChordVoicingInBar(sectionId, bar.id, relativePos, voicing)
        return
      }
      
      currentPos = barEnd
    }
  }

  // Local storage functions
  const saveDraftToLocal = () => {
    if (!title.trim()) return

    const draft = {
      title,
      authorFirstName,
      authorLastName,
      key,
      timeSignature,
      tempo,
      chordProgression,
      structure,
      isPublic,
      savedAt: new Date().toISOString(),
    }

    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
      setHasDraft(true)
    } catch (error) {
      console.error('Failed to save draft:', error)
    }
  }

  const loadDraftFromLocal = (forceLoad = false) => {
    try {
      const draftStr = localStorage.getItem(DRAFT_STORAGE_KEY)
      if (!draftStr) return false

      const draft = JSON.parse(draftStr)
      if (!draft || !draft.title) return false

      if (forceLoad || window.confirm(`Load draft "${draft.title}"? This will replace your current work.`)) {
        setTitle(draft.title || '')
        setAuthorFirstName(draft.authorFirstName || '')
        setAuthorLastName(draft.authorLastName || '')
        setKey(draft.key || 'C')
        setTimeSignature(draft.timeSignature || '4/4')
        setTempo(draft.tempo || 120)
        setChordProgression(draft.chordProgression || ['I', 'IV', 'V', 'vi'])
        setStructure(draft.structure || [])
        setIsPublic(draft.isPublic || false)
        setHasDraft(true)
        toast.success('Draft loaded')
        return true
      }
    } catch (error) {
      console.error('Failed to load draft:', error)
    }
    return false
  }

  const clearDraftFromLocal = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY)
    setHasDraft(false)
  }

  // Save/Load functions
  const handleSave = async () => {
    if (!isAuthenticated) {
      saveDraftToLocal()
      navigate('/login?returnTo=/songwriting')
      return
    }

    if (!isPremium) {
      saveDraftToLocal()
      const returnTo = id ? `/songwriting/${id}` : '/songwriting'
      navigate(`/premium?returnTo=${encodeURIComponent(returnTo)}`)
      return
    }

    if (!title.trim() || !authorFirstName.trim() || !authorLastName.trim()) {
      toast.error('Please fill in title and author name')
      return
    }

    setIsSaving(true)
    try {
      // Convert timelineItems or bars to lyrics/chords for database storage
      const structureForSave = structure.map(section => {
        // If section has timelineItems, use those
        if (section.timelineItems && section.timelineItems.length > 0) {
          const { lyrics, chords } = timelineItemsToLyrics(section.timelineItems, beatsPerBar)
          return {
            ...section,
            lyrics,
            chords,
            // Don't send timelineItems or bars to backend
            timelineItems: undefined,
            bars: undefined,
          }
        }
        
        // Otherwise, use bars (backward compatibility)
        const sectionWithBars = ensureSectionHasBars(section)
        const { lyrics, chords } = barsToLyrics(sectionWithBars.bars || [])
        return {
          ...section,
          lyrics,
          chords,
          // Don't send bars to backend (it doesn't know about them yet)
          bars: undefined,
        }
      })

      const songData = {
        title,
        authorFirstName,
        authorLastName,
        key,
        timeSignature,
        tempo,
        chordProgression,
        structure: structureForSave,
        isPublic,
      }

      if (id) {
        await songwritingApi.update(id, songData)
        toast.success('Song updated!')
      } else {
        const newSong = await songwritingApi.create(songData)
        navigate(`/songwriting/${newSong.id}`)
        toast.success('Song saved!')
      }

      clearDraftFromLocal()
    } catch (error: any) {
      console.error('Error saving song:', error)
      toast.error(error.message || 'Failed to save song')
    } finally {
      setIsSaving(false)
    }
  }


  const loadSong = async (songId: string) => {
    setIsLoading(true)
    try {
      const song = await songwritingApi.getById(songId)
      setTitle(song.title)
      setAuthorFirstName(song.authorFirstName)
      setAuthorLastName(song.authorLastName)
      setKey(song.key)
      setTimeSignature(song.timeSignature)
      setTempo(120) // Tempo not stored in database yet, default to 120
      setChordProgression(song.chordProgression || ['I', 'IV', 'V', 'vi'])
      
      // Convert lyrics to bars for each section
      const structureWithBars = (song.structure || []).map(section => {
        return ensureSectionHasBars(section)
      })
      setStructure(structureWithBars)
      
      setIsPublic(song.isPublic || false)
      clearDraftFromLocal()
    } catch (error: any) {
      console.error('Error loading song:', error)
      toast.error(error.message || 'Failed to load song')
    } finally {
      setIsLoading(false)
    }
  }

  const deleteSong = async (songId: string) => {
    if (!window.confirm('Are you sure you want to delete this song?\n\n⚠️ WARNING: This action cannot be undone. The song will be permanently deleted.')) {
      return
    }

    try {
      await songwritingApi.delete(songId)
      toast.success('Song deleted')
      if (id === songId) {
        navigate('/songwriting')
        setTitle('')
        setAuthorFirstName('')
        setAuthorLastName('')
        setStructure([])
      }
    } catch (error: any) {
      console.error('Error deleting song:', error)
      toast.error(error.message || 'Failed to delete song')
    }
  }

  // Check premium status
  useEffect(() => {
    const checkPremium = async () => {
      if (!isAuthenticated) {
        setIsCheckingPremium(false)
        return
      }

      try {
        const status = await premiumApi.getStatus()
        setPremiumStatus(status)
      } catch (error) {
        console.error('Error checking premium status:', error)
        setPremiumStatus({ isPremium: false, subscriptionStatus: 'free', subscriptionTier: 'free', subscriptionEndsAt: null, stripeCustomerId: null })
      } finally {
        setIsCheckingPremium(false)
      }
    }

    checkPremium()
  }, [isAuthenticated])

  // Load song if ID is present
  useEffect(() => {
    if (id && isAuthenticated) {
      loadSong(id)
    } else if (!id) {
      // Check for draft on mount
      const draftStr = localStorage.getItem(DRAFT_STORAGE_KEY)
      if (draftStr) {
        try {
          const draft = JSON.parse(draftStr)
          if (draft && draft.title) {
            setHasDraft(true)
          }
        } catch (e) {
          // Ignore
        }
      }
    }
  }, [id, isAuthenticated])


  // Auto-save draft
  useEffect(() => {
    if (!title.trim()) return

    const timer = setTimeout(() => {
      saveDraftToLocal()
    }, 30000) // Auto-save every 30 seconds

    return () => clearTimeout(timer)
  }, [title, authorFirstName, authorLastName, key, timeSignature, tempo, chordProgression, structure, isPublic])

  // Handle success/cancel from Stripe
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success('Subscription successful! You can now save your songs.')
      const returnTo = searchParams.get('returnTo')
      if (returnTo) {
        navigate(returnTo)
      }
    } else if (searchParams.get('canceled') === 'true') {
      toast.error('Subscription canceled')
    }
  }, [searchParams, navigate])

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, section: SongSection) => {
    setDraggedSection(section)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    if (!draggedSection) return

    const newStructure = [...structure]
    const draggedIndex = newStructure.findIndex(s => s.id === draggedSection.id)
    
    if (draggedIndex === -1) return

    newStructure.splice(draggedIndex, 1)
    newStructure.splice(targetIndex, 0, draggedSection)
    
    const reordered = newStructure.map((s, idx) => ({ ...s, order: idx }))
    setStructure(reordered)
    setDraggedSection(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedSection(null)
    setDragOverIndex(null)
  }

  if (isLoading || isCheckingPremium) {
    return (
      <div className="spotify-app">
        <Sidebar />
        <div className="main-content">
          <TopBar />
          <div className="content-area">
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
              <LoadingSpinner />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const beatsPerBar = getBeatsPerBar(timeSignature)
  const charsPerBar = beatsPerBar * 4

  return (
    <div className="spotify-app" style={{ width: '100%', maxWidth: '100vw', overflowX: 'hidden', boxSizing: 'border-box' }}>
      <Sidebar />
      <div className="main-content" style={{ width: '100%', maxWidth: '100%', overflowX: 'hidden', boxSizing: 'border-box' }}>
        <TopBar />
        <div className="content-area" style={{ width: '100%', maxWidth: '100%', overflowX: 'hidden', boxSizing: 'border-box' }}>
        
        <div className="songwriting-header">
          <h1>Songwriting Helper</h1>
          <div className="songwriting-controls">
            <button
              className="view-mode-button"
              onClick={() => setShowModeModal(true)}
            >
              {viewMode === 'edit' ? (
                <>
                  <span className="view-icon-small"></span>
                  View
                </>
              ) : (
                <>
                  <span className="edit-icon-small"></span>
                  Edit
                </>
              )}
            </button>
            {viewMode === 'edit' && (
              <>
                {isAuthenticated && isPremium ? (
                  <button
                    className="save-button"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : id ? 'Update' : 'Save'}
                  </button>
                ) : isAuthenticated ? (
                  <button
                    className="save-button"
                    onClick={handleSave}
                  >
                    Upgrade to Save
                  </button>
                ) : (
                  <Link to="/login" className="login-button">
                    Log in to Save
                  </Link>
                )}
              </>
            )}
          </div>
        </div>

        {viewMode === 'view' ? (
          <RenderedSongView
            title={title}
            authorFirstName={authorFirstName}
            authorLastName={authorLastName}
            key={key}
            timeSignature={timeSignature}
            tempo={tempo}
            chordProgression={chordProgression}
            structure={structure}
            createdAt={savedSongs.find(s => s.id === id)?.createdAt || new Date().toISOString()}
            onEdit={() => setShowModeModal(true)}
          />
        ) : (
          <div className="songwriting-form">
            <div className="form-section">
              <h2>Song Details</h2>
              <div className="form-row">
                <div className="form-group">
                  <label>Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter song title"
                  />
                </div>
                <div className="form-group">
                  <label>Author First Name *</label>
                  <input
                    type="text"
                    value={authorFirstName}
                    onChange={(e) => setAuthorFirstName(e.target.value)}
                    placeholder="First name"
                  />
                </div>
                <div className="form-group">
                  <label>Author Last Name *</label>
                  <input
                    type="text"
                    value={authorLastName}
                    onChange={(e) => setAuthorLastName(e.target.value)}
                    placeholder="Last name"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Key</label>
                  <select value={key} onChange={(e) => setKey(e.target.value)}>
                    {MUSICAL_KEYS.map(k => (
                      <option key={k} value={k}>{formatChordName(k)}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Time Signature</label>
                  <select
                    value={timeSignature}
                    onChange={(e) => setTimeSignature(e.target.value as any)}
                  >
                    {TIME_SIGNATURES.map(ts => (
                      <option key={ts} value={ts}>{ts}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Tempo (BPM)</label>
                  <div className="tempo-control">
                    <button
                      type="button"
                      className="tempo-btn"
                      onClick={() => setTempo(Math.max(60, tempo - 1))}
                      aria-label="Decrease tempo"
                    >
                      ←
                    </button>
                    <input
                      type="range"
                      min="60"
                      max="200"
                      value={tempo}
                      onChange={(e) => setTempo(parseInt(e.target.value))}
                      className="tempo-slider"
                    />
                    <button
                      type="button"
                      className="tempo-btn"
                      onClick={() => setTempo(Math.min(200, tempo + 1))}
                      aria-label="Increase tempo"
                    >
                      →
                    </button>
                    <span className="tempo-value">{tempo}</span>
                  </div>
                  <span className="form-hint">Beats per minute - helps define bar timing</span>
                </div>
              </div>
            </div>

            <div className="form-section">
              <h2>Chord Progression (Roman Numerals)</h2>
              <div className="chord-progression-selector">
                <label>Select a Common Progression:</label>
                <select
                  value=""
                  onChange={(e) => {
                    const selected = CHORD_PROGRESSIONS.find(p => p.name === e.target.value)
                    if (selected && selected.progression.length > 0) {
                      setChordProgression([...selected.progression])
                      toast.success(`Applied ${selected.name} progression`)
                    }
                    // Reset select to show placeholder
                    e.target.value = ''
                  }}
                  className="progression-select"
                >
                  <option value="">Choose a progression...</option>
                  {CHORD_PROGRESSIONS.filter(p => p.progression.length > 0).map((prog) => (
                    <option key={prog.name} value={prog.name}>
                      {prog.name} ({prog.progression.join(' - ')})
                    </option>
                  ))}
                </select>
              </div>
              <div className="chord-progression-list">
                {chordProgression.map((chord, idx) => {
                  const actualChord = getChordFromProgression(key, chord)
                  return (
                    <div 
                      key={idx} 
                      className="chord-progression-item draggable-chord"
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = 'copy'
                        e.dataTransfer.setData('application/json', JSON.stringify({ chord }))
                        e.dataTransfer.setData('text/plain', chord)
                        if (e.currentTarget instanceof HTMLElement) {
                          e.currentTarget.style.opacity = '0.5'
                          e.currentTarget.style.cursor = 'grabbing'
                        }
                      }}
                      onDragEnd={(e) => {
                        if (e.currentTarget instanceof HTMLElement) {
                          e.currentTarget.style.opacity = '1'
                          e.currentTarget.style.cursor = 'grab'
                        }
                      }}
                      title="Drag me into a bar block!"
                    >
                      <span className="drag-handle" title="Drag handle">⋮⋮</span>
                      {ROMAN_NUMERALS.includes(chord) ? (
                        <select
                          className="chord-roman-select"
                          value={chord}
                          onChange={(e) => {
                            const newProgression = [...chordProgression]
                            newProgression[idx] = e.target.value
                            setChordProgression(newProgression)
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          {ROMAN_NUMERALS.map(numeral => (
                            <option key={numeral} value={numeral} title={numeral === 'vii°' ? 'Diminished 7th chord' : ''}>
                              {numeral}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="chord-roman">{chord}</span>
                      )}
                      <span className="chord-name">{formatChordName(actualChord)}</span>
                      <button
                        className="remove-chord-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          const newProgression = chordProgression.filter((_, i) => i !== idx)
                          setChordProgression(newProgression)
                        }}
                        title="Remove chord"
                      >
                        ×
                      </button>
                    </div>
                  )
                })}
                <div className="add-chord-control">
                  <select
                    className="add-chord-select"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        const newProgression = [...chordProgression, e.target.value]
                        setChordProgression(newProgression)
                        e.target.value = '' // Reset select
                      }
                    }}
                  >
                    <option value="">+ Add Chord</option>
                    {ROMAN_NUMERALS.map(numeral => (
                      <option key={numeral} value={numeral} title={numeral === 'vii°' ? 'Diminished 7th chord' : ''}>
                        {numeral} ({formatChordName(getChordFromProgression(key, numeral))})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="form-section">
              <h2>Song Structure</h2>
              <div className="section-buttons">
                {SECTION_TYPES.map(st => (
                  <button
                    key={st.type}
                    className="add-section-btn"
                    onClick={() => addSection(st.type)}
                  >
                    + {st.label}
                  </button>
                ))}
              </div>

              <div className="node-canvas-wrapper">
                <NodeBasedCanvas
                  nodes={nodes}
                  onNodesChange={setNodes}
                  timeSignature={timeSignature}
                  tempo={tempo}
                  songKey={key}
                  chordProgression={chordProgression}
                  beatsPerBar={getBeatsPerBar(timeSignature)}
                  isMetronomePlaying={isMetronomePlaying}
                  currentBeat={currentBeat}
                  currentBar={currentBar}
                />
                <div className="metronome-controls">
                  <button
                    className={`metronome-play-btn ${isMetronomePlaying ? 'playing' : ''}`}
                    onClick={() => {
                      if (isMetronomePlaying) {
                        stopMetronome()
                        setIsMetronomePlaying(false)
                        setCurrentBeat(-1)
                        setCurrentBar(0)
                      } else {
                        startMetronome(
                          tempo,
                          getBeatsPerBar(timeSignature),
                          'global',
                          (totalBeat: number) => {
                            // totalBeat is the total beat count from start
                            setCurrentBeat(totalBeat === -1 ? -1 : totalBeat)
                            setCurrentBar(totalBeat === -1 ? 0 : Math.floor(totalBeat / getBeatsPerBar(timeSignature)))
                          },
                          () => {
                            setIsMetronomePlaying(false)
                            setCurrentBeat(-1)
                            setCurrentBar(0)
                          }
                        )
                        setIsMetronomePlaying(true)
                      }
                    }}
                    title={isMetronomePlaying ? 'Stop metronome' : 'Start metronome'}
                  >
                    {isMetronomePlaying ? '⏸' : '▶'}
                  </button>
                  <span className="metronome-label">Metronome</span>
                </div>
              </div>
            </div>

            <div className="form-section">
              <label className="privacy-toggle">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
                <span>Make this song public</span>
              </label>
            </div>
          </div>
        )}

        {hoveredChord && (
          <div
            className="chord-tooltip"
            style={{
              position: 'fixed',
              left: `${hoveredChord.x + 10}px`,
              top: `${hoveredChord.y + 10}px`,
              zIndex: 1000,
            }}
          >
            <div className="chord-tab">
              <pre>{(() => {
                const voicings = getChordVoicings(hoveredChord.chord)
                const voicing = voicings.find(v => v.name === hoveredChord.voicing) || voicings[0]
                return voicing ? generateChordTab(voicing) : 'No tab available'
              })()}</pre>
            </div>
          </div>
        )}

        {showModeModal && (
          <div className="mode-modal-overlay" onClick={() => setShowModeModal(false)}>
            <div className="mode-modal" onClick={(e) => e.stopPropagation()}>
              <div className="mode-modal-header">
                <h2>Switch Mode</h2>
                <button className="mode-modal-close" onClick={() => setShowModeModal(false)}>×</button>
              </div>
              <div className="mode-modal-content">
                <div className="current-mode-indicator">
                  <span className="current-mode-label">Current Mode:</span>
                  <span className={`current-mode-badge ${viewMode === 'edit' ? 'edit-active' : 'view-active'}`}>
                    {viewMode === 'edit' ? (
                      <>
                        <span className="edit-icon-small"></span>
                        Edit Mode
                      </>
                    ) : (
                      <>
                        <span className="view-icon-small"></span>
                        View Mode
                      </>
                    )}
                  </span>
                </div>
                <div className="mode-options">
                  <button
                    className={`mode-option ${viewMode === 'edit' ? 'active' : ''}`}
                    onClick={() => {
                      if (viewMode !== 'edit') {
                        setViewMode('edit')
                      }
                      setShowModeModal(false)
                    }}
                    disabled={viewMode === 'edit'}
                  >
                    <span className="mode-icon edit-icon-modal"></span>
                    <div className="mode-info">
                      <h3>Edit Mode</h3>
                      <p>Edit your song structure, chords, and lyrics</p>
                      {viewMode === 'edit' && <span className="current-indicator">Currently Active</span>}
                    </div>
                  </button>
                  <button
                    className={`mode-option ${viewMode === 'view' ? 'active' : ''}`}
                    onClick={() => {
                      if (viewMode !== 'view') {
                        setViewMode('view')
                      }
                      setShowModeModal(false)
                    }}
                    disabled={viewMode === 'view'}
                  >
                    <span className="mode-icon view-icon-modal"></span>
                    <div className="mode-info">
                      <h3>View Mode</h3>
                      <p>View your song in a clean, readable format</p>
                      {viewMode === 'view' && <span className="current-indicator">Currently Active</span>}
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}

export default Songwriting