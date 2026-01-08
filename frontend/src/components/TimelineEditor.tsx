import { useState, useRef, useEffect } from 'react'
import { TimelineItem, TimelineItemType, SongSection, SongSectionType } from '../types'
import { formatChordName, getChordFromProgression } from '../utils/chords'
import { v4 as uuidv4 } from 'uuid'
import './TimelineEditor.css'

// Metronome utility
let audioContext: AudioContext | null = null
let metronomeInterval: number | null = null

const getAudioContext = async (): Promise<AudioContext> => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
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

interface TimelineEditorProps {
  sections: SongSection[]
  timeSignature: '4/4' | '6/8' | '3/4' | '2/4'
  tempo: number
  songKey: string
  chordProgression: string[]
  onUpdateSection: (sectionId: string, updates: Partial<SongSection>) => void
  onAddSection: (type: SongSectionType) => void
  onDeleteSection: (sectionId: string) => void
}

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

const TimelineEditor = ({
  sections,
  timeSignature,
  tempo,
  songKey,
  chordProgression,
  onUpdateSection,
  onAddSection,
  onDeleteSection,
}: TimelineEditorProps) => {
  const beatsPerBar = getBeatsPerBar(timeSignature)
  const [draggedItem, setDraggedItem] = useState<{ type: string; chord?: string; sectionType?: string } | null>(null)
  const [isMetronomePlaying, setIsMetronomePlaying] = useState(false)
  const [currentBeat, setCurrentBeat] = useState<number>(-1)
  const [currentBar, setCurrentBar] = useState<number>(0)
  const [zoom, setZoom] = useState<number>(1.0)
  const [scrollPosition, setScrollPosition] = useState<number>(0)
  const timelineRef = useRef<HTMLDivElement>(null)
  const [resizingItem, setResizingItem] = useState<{ id: string; startX: number; startBeat: number } | null>(null)
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null)
  const [dragOverTrack, setDragOverTrack] = useState<string | null>(null)
  
  // Calculate pixels per beat based on zoom
  const pixelsPerBeat = 60 * zoom
  const totalBars = Math.max(16, sections.reduce((max, section) => {
    if (!section.timelineItems || section.timelineItems.length === 0) return max
    const lastItem = section.timelineItems.reduce((latest, item) => 
      Math.max(latest, item.startBeat + item.duration), 0
    )
    return Math.max(max, Math.ceil(lastItem / beatsPerBar))
  }, 0))
  const timelineWidth = totalBars * beatsPerBar * pixelsPerBeat

  // Get all timeline items from all sections, organized by track
  const getAllItems = (): { chord: TimelineItem[]; lyric: TimelineItem[]; sectionTitle: TimelineItem[] } => {
    const items: { chord: TimelineItem[]; lyric: TimelineItem[]; sectionTitle: TimelineItem[] } = {
      chord: [],
      lyric: [],
      sectionTitle: [],
    }
    
    sections.forEach(section => {
      if (section.timelineItems) {
        section.timelineItems.forEach(item => {
          if (item.type === 'chord') items.chord.push({ ...item, sectionId: section.id })
          else if (item.type === 'lyric') items.lyric.push({ ...item, sectionId: section.id })
          else if (item.type === 'section-title') items.sectionTitle.push({ ...item, sectionId: section.id })
        })
      }
    })
    
    return items
  }

  // Convert beat to pixel position
  const beatToPixel = (beat: number): number => beat * pixelsPerBeat
  const pixelToBeat = (pixel: number): number => Math.max(0, Math.floor(pixel / pixelsPerBeat))

  // Handle drag start from palette
  const handlePaletteDragStart = (e: React.DragEvent, type: string, chord?: string, sectionType?: string) => {
    console.log('🎨 Drag start from palette', { type, chord, sectionType })
    setDraggedItem({ type, chord, sectionType })
    e.dataTransfer.effectAllowed = 'copy'
    e.dataTransfer.setData('text/plain', JSON.stringify({ type, chord, sectionType }))
    e.dataTransfer.setData('application/json', JSON.stringify({ type, chord, sectionType }))
  }

  // Handle drop on timeline
  const handleTimelineDrop = (e: React.DragEvent, track: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    console.log('🎯 Drop event', { track, draggedItem, dataTransfer: e.dataTransfer.getData('text/plain') })
    
    let data = draggedItem
    if (!data) {
      const dataStr = e.dataTransfer.getData('text/plain')
      if (dataStr) {
        try {
          data = JSON.parse(dataStr)
        } catch (err) {
          console.error('Failed to parse drag data', err)
          return
        }
      }
    }
    
    // Restrict section-title drops to only the "section" track
    if (data && data.type === 'section-title' && track !== 'section') {
      console.log('Section-title can only be dropped on the Sections track')
      return
    }
    
    // Restrict chords to chord track and lyrics to lyric track
    if (data && data.type === 'chord' && track !== 'chord') {
      console.log('Chords can only be dropped on the Chords track')
      return
    }
    
    if (data && data.type === 'lyric' && track !== 'lyric') {
      console.log('Lyrics can only be dropped on the Lyrics track')
      return
    }
    if (!data) {
      const dataStr = e.dataTransfer.getData('text/plain')
      if (dataStr) {
        try {
          data = JSON.parse(dataStr)
        } catch (err) {
          console.error('Failed to parse drag data', err)
          return
        }
      }
    }
    
    if (!data || !data.type) {
      console.log('No valid drag data')
      return
    }

    const rect = timelineRef.current?.getBoundingClientRect()
    if (!rect) {
      console.log('No timeline rect')
      return
    }

    const x = e.clientX - rect.left + scrollPosition
    const beat = pixelToBeat(x)
    
    console.log('Drop position', { x, scrollPosition, beat, clientX: e.clientX, rectLeft: rect.left })

    // Handle section-title drops differently - they can work even without existing sections
    let targetSection: SongSection | null = null
    
    if (data.type === 'section-title') {
      // For section-title, find existing section of this type
      targetSection = sections.find(s => s.type === data.sectionType) || null
      
      // If no section of this type exists, create one
      if (!targetSection) {
        console.log('No section of type', data.sectionType, 'exists, creating it')
        onAddSection((data.sectionType || 'verse') as SongSectionType)
        // Since React state updates are async, we can't immediately use the new section
        // But we can still proceed - use the first section if available, or wait for next render
        if (sections.length > 0) {
          targetSection = sections[0] // Use first section temporarily
        } else {
          // No sections at all - the one we just created isn't in state yet
          // Skip the error check and allow the drop to proceed
          // The section will be created and the item can be added on next interaction
          console.log('Section will be created - skipping validation for section-title')
          // Don't return - allow it to proceed without a section check
        }
      }
    } else {
      // For chords and lyrics, we need an existing section
      if (sections.length === 0) {
        console.log('No sections exist - please add a section first')
        alert('Please add a section (Intro, Verse, Chorus, etc.) before placing chords')
        return
      }
      
      // Find which section this beat belongs to
      let currentBeat = 0
      for (const section of sections.sort((a, b) => (a.order || 0) - (b.order || 0))) {
        // Calculate section length: use existing items or default to 16 bars
        const sectionBeats = (section.timelineItems || []).length > 0
          ? (section.timelineItems || []).reduce((max, item) => 
              Math.max(max, item.startBeat + item.duration), 0
            )
          : beatsPerBar * 16 // Default to 16 bars if empty
        
        if (beat >= currentBeat && beat < currentBeat + sectionBeats) {
          targetSection = section
          break
        }
        currentBeat += sectionBeats
      }

      // If we still don't have a section (beat is beyond all sections), use the last one
      if (!targetSection && sections.length > 0) {
        targetSection = sections.sort((a, b) => (a.order || 0) - (b.order || 0))[sections.length - 1]
      }
    }
    
    // If still no target section, use first available
    if (!targetSection && sections.length > 0) {
      targetSection = sections[0]
    }

    if (!targetSection) {
      console.log('No target section found')
      return
    }
    
    console.log('Target section found', { sectionId: targetSection.id, sectionType: targetSection.type, beat })

    // Create new timeline item
    const newItem: TimelineItem = {
      id: uuidv4(),
      type: data.type as TimelineItemType,
      startBeat: beat,
      duration: data.type === 'chord' ? 4 : data.type === 'section-title' ? beatsPerBar * 4 : beatsPerBar,
      content: data.type === 'chord' 
        ? getChordFromProgression(songKey, data.chord || 'I')
        : data.type === 'section-title'
        ? (data.sectionType || targetSection.type)
        : '',
      sectionId: data.type === 'section-title' ? undefined : targetSection.id,
    }
    
    // For section-title items, we might want to create a new section or just mark the position
    // For now, we'll add it to the target section but mark it as a section-title

    console.log('Creating new item', newItem)

    // Add to section's timelineItems
    const existingItems = targetSection.timelineItems || []
    const updatedItems = [...existingItems, newItem]
    console.log('Updating section', { 
      sectionId: targetSection.id, 
      itemCount: updatedItems.length,
      newItem,
      existingItems: existingItems.length,
      updatedItems 
    })
    
    // Call the update function
    onUpdateSection(targetSection.id, { timelineItems: updatedItems })
    
    // Force a small delay to ensure state update
    setTimeout(() => {
      console.log('State should be updated now')
    }, 100)
    
    setDraggedItem(null)
  }

  // Handle item drag start (moving existing items)
  const handleItemDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggingItemId(itemId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'move', id: itemId }))
  }

  // Handle item drag end (moving existing items)
  const handleItemDragEnd = (e: React.DragEvent, itemId: string) => {
    if (e.dataTransfer.dropEffect === 'move') {
      const rect = timelineRef.current?.getBoundingClientRect()
      if (rect) {
        const x = e.clientX - rect.left + scrollPosition
        const newBeat = pixelToBeat(x)

        // Find the item
        let targetSection: SongSection | null = null
        
        for (const section of sections) {
          if (section.timelineItems) {
            const found = section.timelineItems.find(i => i.id === itemId)
            if (found) {
              targetSection = section
              break
            }
          }
        }

        if (targetSection) {
          // Update item position
          const updatedItems = (targetSection.timelineItems || []).map(i =>
            i.id === itemId ? { ...i, startBeat: newBeat } : i
          )
          onUpdateSection(targetSection.id, { timelineItems: updatedItems })
        }
      }
    }
    setDraggingItemId(null)
  }

  // Handle item resize
  const handleResizeStart = (e: React.MouseEvent, itemId: string, currentBeat: number) => {
    e.stopPropagation()
    setResizingItem({ id: itemId, startX: e.clientX, startBeat: currentBeat })
  }

  const handleResize = (e: MouseEvent) => {
    if (!resizingItem || !timelineRef.current) return

    const rect = timelineRef.current.getBoundingClientRect()
    const deltaX = e.clientX - resizingItem.startX
    const deltaBeats = pixelToBeat(deltaX)
    const newDuration = Math.max(1, Math.floor(deltaBeats))

    // Find and update item
    for (const section of sections) {
      if (section.timelineItems) {
        const item = section.timelineItems.find(i => i.id === resizingItem.id)
        if (item) {
          const updatedItems = section.timelineItems.map(i =>
            i.id === resizingItem.id ? { ...i, duration: newDuration } : i
          )
          onUpdateSection(section.id, { timelineItems: updatedItems })
          break
        }
      }
    }
  }

  const handleResizeEnd = () => {
    setResizingItem(null)
  }

  useEffect(() => {
    if (resizingItem) {
      document.addEventListener('mousemove', handleResize)
      document.addEventListener('mouseup', handleResizeEnd)
      return () => {
        document.removeEventListener('mousemove', handleResize)
        document.removeEventListener('mouseup', handleResizeEnd)
      }
    }
  }, [resizingItem])

  // Metronome functions
  const startMetronome = () => {
    if (metronomeInterval !== null) {
      clearInterval(metronomeInterval)
      metronomeInterval = null
    }

    setIsMetronomePlaying(true)
    const beatDuration = 60000 / tempo
    const beatsPerBarValue = beatsPerBar
    let beatCount = 0

    playMetronomeClick(true)
    setCurrentBeat(0)
    setCurrentBar(0)
    beatCount = 1

    metronomeInterval = window.setInterval(() => {
      const beat = beatCount % beatsPerBarValue
      const bar = Math.floor(beatCount / beatsPerBarValue)
      const isFirstBeat = beat === 0

      playMetronomeClick(isFirstBeat)
      setCurrentBeat(beat)
      setCurrentBar(bar)
      beatCount++
    }, beatDuration)
  }

  const stopMetronome = () => {
    if (metronomeInterval !== null) {
      clearInterval(metronomeInterval)
      metronomeInterval = null
    }
    setIsMetronomePlaying(false)
    setCurrentBeat(-1)
    setCurrentBar(0)
  }

  useEffect(() => {
    return () => {
      if (metronomeInterval !== null) {
        clearInterval(metronomeInterval)
        metronomeInterval = null
      }
      setIsMetronomePlaying(false)
      setCurrentBeat(-1)
      setCurrentBar(0)
    }
  }, [])

  const allItems = getAllItems()

  return (
    <div className="timeline-editor">
        {/* Toolbar */}
        <div className="timeline-toolbar">
          <div className="toolbar-section">
            <h3>Zoom</h3>
            <div className="zoom-controls">
              <button
                className="zoom-btn"
                onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}
                title="Zoom Out"
              >
                −
              </button>
              <span className="zoom-level">{Math.round(zoom * 100)}%</span>
              <button
                className="zoom-btn"
                onClick={() => setZoom(Math.min(4, zoom + 0.25))}
                title="Zoom In"
              >
                +
              </button>
            </div>
          </div>
          <div className="toolbar-section">
            <h3>Chords</h3>
            <div className="chord-palette">
              {chordProgression.map((chord, idx) => {
                const actualChord = formatChordName(chord)
                const dragId = `palette-chord-${chord}-${idx}`
                return (
                  <div
                    key={idx}
                    className={`palette-item chord-palette-item ${draggedItem?.chord === chord ? 'dragging' : ''}`}
                    draggable
                    onDragStart={(e) => handlePaletteDragStart(e, 'chord', chord)}
                    onDragEnd={(e) => {
                      setDraggedItem(null)
                      setDragOverTrack(null)
                      // If drop didn't happen on a valid target, clear
                      if (e.dataTransfer.dropEffect === 'none') {
                        console.log('Drag cancelled - item not dropped')
                      }
                    }}
                    title="Drag to timeline"
                  >
                    {actualChord}
                  </div>
                )
              })}
            </div>
          </div>
          <div className="toolbar-section">
            <h3>Sections</h3>
            <div className="section-palette">
              {['intro', 'verse', 'chorus', 'bridge', 'outro'].map((type) => (
                <div
                  key={type}
                  className={`palette-item section-palette-item ${draggedItem?.sectionType === type ? 'dragging' : ''}`}
                  draggable
                  onDragStart={(e) => handlePaletteDragStart(e, 'section-title', undefined, type)}
                  onDragEnd={(e) => {
                    setDraggedItem(null)
                    setDragOverTrack(null)
                    if (e.dataTransfer.dropEffect === 'none') {
                      console.log('Section drag cancelled - item not dropped')
                    }
                  }}
                  onClick={() => onAddSection(type as SongSectionType)}
                  title="Drag to timeline or click to add section"
                >
                  + {type}
                </div>
              ))}
            </div>
          </div>
          <div className="toolbar-section">
            <button
              className={`metronome-btn ${isMetronomePlaying ? 'playing' : ''}`}
              onClick={() => isMetronomePlaying ? stopMetronome() : startMetronome()}
              title={isMetronomePlaying ? 'Stop metronome' : 'Start metronome'}
            >
              {isMetronomePlaying ? '⏸' : '▶'}
            </button>
          </div>
        </div>

        {/* DAW-style Timeline */}
        <div className="timeline-container">
          {/* Track labels */}
          <div className="track-labels">
            <div className="track-label">Chords</div>
            <div className="track-label">Lyrics</div>
            <div className="track-label">Sections</div>
          </div>

          {/* Timeline canvas */}
          <div 
            className="timeline-canvas"
            ref={timelineRef}
            onScroll={(e) => setScrollPosition(e.currentTarget.scrollLeft)}
          >
            {/* Grid background */}
            <div 
              className="timeline-grid"
              style={{ width: `${timelineWidth}px` }}
            >
              {Array.from({ length: totalBars }).map((_, barIdx) => (
                <div
                  key={barIdx}
                  className="timeline-bar"
                  style={{
                    left: `${beatToPixel(barIdx * beatsPerBar)}px`,
                    width: `${beatToPixel(beatsPerBar)}px`,
                  }}
                >
                  <div className="bar-number">{barIdx + 1}</div>
                  {Array.from({ length: beatsPerBar }).map((_, beatIdx) => (
                    <div
                      key={beatIdx}
                      className={`timeline-beat ${isMetronomePlaying && currentBar === barIdx && currentBeat === beatIdx ? 'active' : ''}`}
                      style={{
                        left: `${beatToPixel(beatIdx)}px`,
                        width: `${pixelsPerBeat}px`,
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>

            {/* Timeline items - organized by sections as containers */}
            <div className="timeline-items" style={{ width: `${timelineWidth}px` }}>
              {/* Render sections as containers */}
              {sections.map((section) => {
                const sectionItems = section.timelineItems || []
                const sectionChords = sectionItems.filter(item => item.type === 'chord')
                const sectionLyrics = sectionItems.filter(item => item.type === 'lyric')
                const sectionTitle = sectionItems.find(item => item.type === 'section-title')
                
                // Calculate section bounds
                const allSectionBeats = sectionItems.length > 0
                  ? sectionItems.map(item => item.startBeat + item.duration)
                  : [beatsPerBar * 4] // Default to 4 bars
                const sectionEndBeat = Math.max(...allSectionBeats)
                const sectionStartBeat = sectionItems.length > 0
                  ? Math.min(...sectionItems.map(item => item.startBeat))
                  : 0
                const sectionWidth = beatToPixel(sectionEndBeat - sectionStartBeat)
                const sectionLeft = beatToPixel(sectionStartBeat)
                
                return (
                  <div
                    key={section.id}
                    className="section-container"
                    style={{
                      left: `${sectionLeft}px`,
                      width: `${sectionWidth}px`,
                    }}
                  >
                    {/* Section header/title */}
                    <div className="section-header">
                      <span className="section-title-text">{section.type}</span>
                    </div>
                    
                    {/* Section content - chords and lyrics */}
                    <div className="section-content">
                      {/* Chord track within section */}
                      <div className="timeline-track section-track" data-track="chord" data-section-id={section.id}>
                        {sectionChords.map((item) => (
                          <div
                            key={item.id}
                            className={`timeline-item chord-item ${draggingItemId === item.id ? 'dragging' : ''}`}
                            style={{
                              left: `${beatToPixel(item.startBeat - sectionStartBeat)}px`,
                              width: `${beatToPixel(item.duration)}px`,
                            }}
                            draggable
                            onDragStart={(e) => handleItemDragStart(e, item.id)}
                            onDragEnd={(e) => handleItemDragEnd(e, item.id)}
                          >
                            <span className="item-content">{formatChordName(item.content)}</span>
                            <div
                              className="resize-handle"
                              onMouseDown={(e) => handleResizeStart(e, item.id, item.startBeat)}
                            />
                          </div>
                        ))}
                      </div>

                      {/* Lyrics track within section */}
                      <div className="timeline-track section-track" data-track="lyric" data-section-id={section.id}>
                        {sectionLyrics.map((item) => (
                          <div
                            key={item.id}
                            className={`timeline-item lyric-item ${draggingItemId === item.id ? 'dragging' : ''}`}
                            style={{
                              left: `${beatToPixel(item.startBeat - sectionStartBeat)}px`,
                              width: `${beatToPixel(item.duration)}px`,
                            }}
                            draggable
                            onDragStart={(e) => handleItemDragStart(e, item.id)}
                            onDragEnd={(e) => handleItemDragEnd(e, item.id)}
                          >
                            <span className="item-content">{item.content}</span>
                            <div
                              className="resize-handle"
                              onMouseDown={(e) => handleResizeStart(e, item.id, item.startBeat)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
              
              {/* Standalone tracks for items not in sections (fallback) */}
              <div className="timeline-track" data-track="chord">
                {allItems.chord.filter(item => !item.sectionId).map((item) => (
                  <div
                    key={item.id}
                    className={`timeline-item chord-item ${draggingItemId === item.id ? 'dragging' : ''}`}
                    style={{
                      left: `${beatToPixel(item.startBeat)}px`,
                      width: `${beatToPixel(item.duration)}px`,
                    }}
                    draggable
                    onDragStart={(e) => handleItemDragStart(e, item.id)}
                    onDragEnd={(e) => handleItemDragEnd(e, item.id)}
                  >
                    <span className="item-content">{formatChordName(item.content)}</span>
                    <div
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart(e, item.id, item.startBeat)}
                    />
                  </div>
                ))}
              </div>

              <div className="timeline-track" data-track="lyric">
                {allItems.lyric.filter(item => !item.sectionId).map((item) => (
                  <div
                    key={item.id}
                    className={`timeline-item lyric-item ${draggingItemId === item.id ? 'dragging' : ''}`}
                    style={{
                      left: `${beatToPixel(item.startBeat)}px`,
                      width: `${beatToPixel(item.duration)}px`,
                    }}
                    draggable
                    onDragStart={(e) => handleItemDragStart(e, item.id)}
                    onDragEnd={(e) => handleItemDragEnd(e, item.id)}
                  >
                    <span className="item-content">{item.content}</span>
                    <div
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart(e, item.id, item.startBeat)}
                    />
                  </div>
                ))}
              </div>
              
              {/* Section titles track (for positioning sections) */}
              <div className="timeline-track" data-track="section">
                {allItems.sectionTitle.map((item) => (
                  <div
                    key={item.id}
                    className="timeline-item section-item"
                    style={{
                      left: `${beatToPixel(item.startBeat)}px`,
                      width: `${beatToPixel(item.duration)}px`,
                    }}
                  >
                    <span className="item-content">{item.content}</span>
                  </div>
                ))}
              </div>

              {/* Drop zones - must be on top */}
              {['chord', 'lyric', 'section'].map((track) => (
                <div
                  key={track}
                  className={`timeline-drop-zone ${dragOverTrack === track ? 'drag-over' : ''}`}
                  data-track={track}
                  onDragEnter={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setDragOverTrack(track)
                    console.log('Drag enter', track)
                  }}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    e.dataTransfer.dropEffect = 'copy'
                    setDragOverTrack(track)
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    // Only clear if we're actually leaving the drop zone
                    const rect = e.currentTarget.getBoundingClientRect()
                    const x = e.clientX
                    const y = e.clientY
                    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                      setDragOverTrack(null)
                      console.log('Drag leave', track)
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setDragOverTrack(null)
                    handleTimelineDrop(e, track)
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
  )
}

export default TimelineEditor
