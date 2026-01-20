import { useState, useRef, useEffect, useCallback } from 'react'
import { SongNode, NodeType } from '../types'
import { formatChordName, getChordFromProgression, getChordVoicings } from '../utils/chords'
import { v4 as uuidv4 } from 'uuid'
import './NodeBasedCanvas.css'

interface NodeBasedCanvasProps {
  nodes: SongNode[]
  onNodesChange: (nodes: SongNode[]) => void
  timeSignature: '4/4' | '6/8' | '3/4' | '2/4'
  tempo: number
  songKey: string
  chordProgression: string[]
  beatsPerBar: number
  isMetronomePlaying: boolean
  currentBeat: number
  currentBar: number
  sectionTypes?: Array<{ type: string; label: string }>
  onAddSection?: (sectionType: string) => void // sectionType will be cast to SongSectionType in parent
}

const NodeBasedCanvas = ({
  nodes,
  onNodesChange,
  timeSignature,
  tempo,
  songKey,
  chordProgression,
  beatsPerBar,
  isMetronomePlaying,
  currentBeat,
  currentBar,
  sectionTypes = [],
  onAddSection,
}: NodeBasedCanvasProps) => {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [draggedNode, setDraggedNode] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null)
  const [resizingNode, setResizingNode] = useState<string | null>(null)
  const [resizeStart, setResizeStart] = useState<{ x: number; width: number } | null>(null)
  const [editingNode, setEditingNode] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [isDraggingOverCanvas, setIsDraggingOverCanvas] = useState(false)
  const [numberOfRows, setNumberOfRows] = useState<number>(4) // Start with 4 rows

  // Grid configuration
  const gridSize = 50 // pixels per grid square
  const barsPerRow = 16 // Number of bars to show horizontally
  const totalBars = barsPerRow * numberOfRows // Total bars = bars per row * number of rows
  const canvasWidth = barsPerRow * beatsPerBar * gridSize
  const rowHeight = 200 // Height of each row in pixels
  const canvasHeight = numberOfRows * rowHeight
  
  // Calculate which bar the current beat is in
  const getBarFromBeat = (beat: number): number => {
    return Math.floor(beat / beatsPerBar)
  }
  
  // Calculate which beat within the bar
  const getBeatInBar = (beat: number): number => {
    return beat % beatsPerBar
  }

  // Handle node drag start
  const handleNodeDragStart = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.preventDefault()
    e.stopPropagation()
    const node = nodes.find(n => n.id === nodeId)
    if (!node || !canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    setDraggedNode(nodeId)
    setDragOffset({
      x: e.clientX - rect.left - node.x,
      y: e.clientY - rect.top - node.y,
    })
    setSelectedNode(nodeId)
  }, [nodes])

  // Handle mouse move for dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggedNode || !dragOffset || !canvasRef.current) return

      const rect = canvasRef.current.getBoundingClientRect()
      const newX = e.clientX - rect.left - dragOffset.x
      const newY = e.clientY - rect.top - dragOffset.y

      // Update node position (no grid snapping)
      const updatedNodes = nodes.map(node =>
        node.id === draggedNode
          ? { ...node, x: Math.max(0, newX), y: Math.max(0, newY) }
          : node
      )
      onNodesChange(updatedNodes)
    }

    const handleMouseUp = () => {
      setDraggedNode(null)
      setDragOffset(null)
    }

    if (draggedNode) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [draggedNode, dragOffset, nodes, onNodesChange])

  // Handle resize start
  const handleResizeStart = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.preventDefault()
    e.stopPropagation()
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return

    setResizingNode(nodeId)
    setResizeStart({
      x: e.clientX,
      width: node.width,
    })
  }, [nodes])

  // Handle resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingNode || !resizeStart || !canvasRef.current) return

      const rect = canvasRef.current.getBoundingClientRect()
      const deltaX = e.clientX - resizeStart.x
      const minWidth = 100 // Minimum width for lyrics nodes
      const newWidth = Math.max(minWidth, resizeStart.width + deltaX)

      const updatedNodes = nodes.map(node =>
        node.id === resizingNode && node.type === 'lyric'
          ? { ...node, width: newWidth }
          : node
      )
      onNodesChange(updatedNodes)
    }

    const handleMouseUp = () => {
      setResizingNode(null)
      setResizeStart(null)
    }

    if (resizingNode) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [resizingNode, resizeStart, nodes, onNodesChange])

  // Handle drop on canvas from palette items
  const handleCanvasDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!canvasRef.current) return
    
    const nodeType = e.dataTransfer.getData('application/node-type')
    if (!nodeType) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (nodeType === 'lyric') {
      // Create a new lyric node
      const newNode: SongNode = {
        id: uuidv4(),
        type: 'lyric',
        x,
        y,
        width: 200,
        content: '',
      }
      onNodesChange([...nodes, newNode])
      setEditingNode(newNode.id)
      setSelectedNode(newNode.id)
    } else if (nodeType === 'chord') {
      const chord = e.dataTransfer.getData('application/chord')
      if (chord) {
        const actualChord = getChordFromProgression(songKey, chord)
        const voicings = getChordVoicings(actualChord)
        const defaultVoicing = voicings[0]?.name || 'Open'

        const newNode: SongNode = {
          id: uuidv4(),
          type: 'chord',
          x,
          y,
          width: 80,
          height: 40,
          content: formatChordName(actualChord),
          voicing: defaultVoicing,
        }
        onNodesChange([...nodes, newNode])
        setSelectedNode(newNode.id)
      }
    } else if (nodeType === 'section') {
      const sectionType = e.dataTransfer.getData('application/section-type')
      const sectionLabel = e.dataTransfer.getData('application/section-label')
      if (sectionType && onAddSection) {
        // Call the parent's addSection function to add to structure
        onAddSection(sectionType)
        
        // Also create a visual node on the canvas
        const newNode: SongNode = {
          id: uuidv4(),
          type: 'section',
          x,
          y,
          width: 120,
          height: 40,
          content: sectionLabel,
          sectionType: sectionType,
        }
        onNodesChange([...nodes, newNode])
        setSelectedNode(newNode.id)
      }
    }
  }, [nodes, onNodesChange, songKey, onAddSection])

  // Handle node content edit
  const handleNodeContentChange = useCallback((nodeId: string, content: string) => {
    const updatedNodes = nodes.map(node =>
      node.id === nodeId ? { ...node, content } : node
    )
    onNodesChange(updatedNodes)
  }, [nodes, onNodesChange])


  // Delete node (in-memory, no confirmation needed)
  const handleDeleteNode = useCallback((nodeId: string) => {
    onNodesChange(nodes.filter(n => n.id !== nodeId))
    if (selectedNode === nodeId) setSelectedNode(null)
    if (editingNode === nodeId) setEditingNode(null)
  }, [nodes, onNodesChange, selectedNode, editingNode])

  return (
    <div className="node-based-canvas-container">
      {/* Toolbar with node palette */}
      <div className="node-canvas-toolbar">
        <div className="node-palette-section">
          <h3>Add Nodes</h3>
          <div className="node-palette">
            {/* Add Lyrics button - draggable */}
            <div
              className="palette-node-item lyrics-palette-item"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'copy'
                e.dataTransfer.setData('application/node-type', 'lyric')
              }}
              title="Drag to canvas to add lyrics node"
            >
              📝 Add Lyrics
            </div>
            
            {/* Section palette items - draggable */}
            {sectionTypes.length > 0 && (
              <div className="section-palette-group">
                <h4>Sections</h4>
                <div className="section-palette">
                  {sectionTypes.map((section) => (
                    <div
                      key={section.type}
                      className="palette-node-item section-palette-item"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = 'copy'
                        e.dataTransfer.setData('application/node-type', 'section')
                        e.dataTransfer.setData('application/section-type', section.type)
                        e.dataTransfer.setData('application/section-label', section.label)
                      }}
                      title={`Drag to canvas to add ${section.label} section`}
                    >
                      + {section.label}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Chord palette items - draggable */}
            <div className="chord-palette-group">
              <h4>Chords</h4>
              <div className="chord-palette">
                {chordProgression.map((chord, idx) => {
                  const actualChord = formatChordName(getChordFromProgression(songKey, chord))
                  return (
                    <div
                      key={idx}
                      className="palette-node-item chord-palette-item"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = 'copy'
                        e.dataTransfer.setData('application/node-type', 'chord')
                        e.dataTransfer.setData('application/chord', chord)
                      }}
                      title={`Drag to canvas to add ${actualChord} node`}
                    >
                      {actualChord}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
        <div className="toolbar-controls">
          <button
            className="add-row-btn"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setNumberOfRows(prev => prev + 1)
            }}
            title="Add a row to expand the grid"
          >
            + Add Row
          </button>
          <span className="toolbar-hint">
            💡 Drag nodes from palette onto canvas to add them
          </span>
        </div>
      </div>

      {/* Canvas with grid background */}
      <div
        ref={canvasRef}
        className={`node-canvas ${isDraggingOverCanvas ? 'drag-over' : ''}`}
        style={{
          '--grid-size': `${gridSize}px`,
          '--beats-per-bar': beatsPerBar,
        } as React.CSSProperties}
        onDragEnter={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (e.dataTransfer.types.includes('application/node-type')) {
            setIsDraggingOverCanvas(true)
          }
        }}
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (e.dataTransfer.types.includes('application/node-type')) {
            e.dataTransfer.dropEffect = 'copy'
            setIsDraggingOverCanvas(true)
          }
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          e.stopPropagation()
          // Only clear if we're actually leaving the canvas
          const rect = canvasRef.current?.getBoundingClientRect()
          if (rect) {
            const x = e.clientX
            const y = e.clientY
            if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
              setIsDraggingOverCanvas(false)
            }
          }
        }}
        onDrop={(e) => {
          setIsDraggingOverCanvas(false)
          handleCanvasDrop(e)
        }}
      >
        <div
          className="canvas-inner"
          style={{
            width: `${canvasWidth}px`,
            height: `${canvasHeight}px`,
            position: 'relative',
          }}
        >
          {/* Static grid background */}
          <div className="canvas-grid-background">
          {Array.from({ length: totalBars }).map((_, barIdx) => {
            const barX = (barIdx % barsPerRow) * beatsPerBar * gridSize
            const barY = Math.floor(barIdx / barsPerRow) * rowHeight
            const isActiveBar = isMetronomePlaying && currentBar === barIdx
            const activeBeatInBar = isMetronomePlaying ? getBeatInBar(currentBeat) : -1
            return (
              <div
                key={barIdx}
                className={`canvas-bar ${isActiveBar ? 'active-bar' : ''}`}
                style={{
                  left: `${barX}px`,
                  top: `${barY}px`,
                  width: `${beatsPerBar * gridSize}px`,
                }}
              >
                <div className="bar-label">Bar {barIdx + 1}</div>
                {Array.from({ length: beatsPerBar }).map((_, beatIdx) => (
                  <div
                    key={beatIdx}
                    className={`canvas-beat ${isActiveBar && activeBeatInBar === beatIdx ? 'active-beat' : ''}`}
                    style={{
                      left: `${beatIdx * gridSize}px`,
                      width: `${gridSize}px`,
                    }}
                  />
                ))}
              </div>
            )
          })}
          </div>

          {/* Nodes layer */}
          <div className="canvas-nodes-layer">
          {nodes.map((node) => (
            <div
              key={node.id}
              className={`song-node ${node.type} ${selectedNode === node.id ? 'selected' : ''} ${draggedNode === node.id ? 'dragging' : ''}`}
              style={{
                left: `${node.x}px`,
                top: `${node.y}px`,
                width: `${node.width}px`,
                height: node.height ? `${node.height}px` : 'auto',
                zIndex: node.zIndex || 10,
              }}
              onMouseDown={(e) => {
                if (node.type === 'lyric' || node.type === 'section') {
                  handleNodeDragStart(e, node.id)
                }
              }}
            >
              {node.type === 'section' ? (
                <div className="section-node-wrapper">
                  <button
                    className="node-delete-btn section-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteNode(node.id)
                    }}
                    title="Delete node"
                  >
                    ×
                  </button>
                  <div
                    className="node-content-display section-node-content"
                    onMouseDown={(e) => handleNodeDragStart(e, node.id)}
                  >
                    {node.content}
                  </div>
                </div>
              ) : node.type === 'lyric' ? (
                <>
                  <div className="node-header">
                    <span className="node-type-label">Lyrics</span>
                    <button
                      className="node-delete-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteNode(node.id)
                      }}
                      title="Delete node"
                    >
                      ×
                    </button>
                  </div>
                  {editingNode === node.id ? (
                    <textarea
                      className="node-content-input"
                      value={node.content}
                      onChange={(e) => handleNodeContentChange(node.id, e.target.value)}
                      onBlur={() => setEditingNode(null)}
                      autoFocus
                      style={{ width: '100%', minHeight: '60px' }}
                      placeholder="Enter lyrics..."
                    />
                  ) : (
                    <div
                      className="node-content-display"
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingNode(node.id)
                        setSelectedNode(node.id)
                      }}
                    >
                      {node.content || <span className="placeholder">Click to edit lyrics...</span>}
                    </div>
                  )}
                  <div
                    className="node-resize-handle"
                    onMouseDown={(e) => {
                      e.stopPropagation()
                      handleResizeStart(e, node.id)
                    }}
                  />
                </>
              ) : (
                <div className="chord-node-wrapper">
                  <button
                    className="node-delete-btn chord-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteNode(node.id)
                    }}
                    title="Delete node"
                  >
                    ×
                  </button>
                  <div
                    className="node-content-display chord-node-content"
                    onMouseDown={(e) => handleNodeDragStart(e, node.id)}
                  >
                    {formatChordName(node.content)}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        </div>
      </div>
    </div>
  )
}

export default NodeBasedCanvas
