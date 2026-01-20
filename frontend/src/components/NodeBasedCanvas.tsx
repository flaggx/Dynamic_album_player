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
}: NodeBasedCanvasProps) => {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [draggedNode, setDraggedNode] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null)
  const [resizingNode, setResizingNode] = useState<string | null>(null)
  const [resizeStart, setResizeStart] = useState<{ x: number; width: number } | null>(null)
  const [editingNode, setEditingNode] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)

  // Grid configuration
  const gridSize = 20 // pixels per grid square
  const barsPerRow = 16 // Number of bars to show horizontally
  const totalBars = Math.max(32, Math.ceil(nodes.length / 4)) // Dynamic based on content
  const canvasWidth = barsPerRow * beatsPerBar * gridSize
  const canvasHeight = Math.max(800, Math.ceil(totalBars / barsPerRow) * 200)
  
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

  // Add new node on canvas click
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current || editingNode || draggedNode || resizingNode) return
    if ((e.target as HTMLElement).closest('.song-node')) return // Don't add if clicking on existing node

    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

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
  }, [nodes, onNodesChange, editingNode, draggedNode, resizingNode])

  // Handle node content edit
  const handleNodeContentChange = useCallback((nodeId: string, content: string) => {
    const updatedNodes = nodes.map(node =>
      node.id === nodeId ? { ...node, content } : node
    )
    onNodesChange(updatedNodes)
  }, [nodes, onNodesChange])

  // Add chord node from palette
  const handleAddChordNode = useCallback((chord: string, e: React.MouseEvent) => {
    if (!canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

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
  }, [nodes, onNodesChange, songKey])

  // Delete node
  const handleDeleteNode = useCallback((nodeId: string) => {
    if (window.confirm('Delete this node?')) {
      onNodesChange(nodes.filter(n => n.id !== nodeId))
      if (selectedNode === nodeId) setSelectedNode(null)
      if (editingNode === nodeId) setEditingNode(null)
    }
  }, [nodes, onNodesChange, selectedNode, editingNode])

  return (
    <div className="node-based-canvas-container">
      {/* Toolbar with chord palette */}
      <div className="node-canvas-toolbar">
        <div className="chord-palette-section">
          <h3>Chords</h3>
          <div className="chord-palette">
            {chordProgression.map((chord, idx) => {
              const actualChord = formatChordName(getChordFromProgression(songKey, chord))
              return (
                <div
                  key={idx}
                  className="palette-chord-item"
                  onClick={(e) => handleAddChordNode(chord, e)}
                  title={`Click to add ${actualChord} node`}
                >
                  {actualChord}
                </div>
              )
            })}
          </div>
        </div>
        <div className="toolbar-hint">
          <span>💡 Click on canvas to add lyrics • Drag chords from palette</span>
        </div>
      </div>

      {/* Canvas with grid background */}
      <div
        ref={canvasRef}
        className="node-canvas"
        style={{
          width: `${canvasWidth}px`,
          height: `${canvasHeight}px`,
          '--grid-size': `${gridSize}px`,
          '--beats-per-bar': beatsPerBar,
        } as React.CSSProperties}
        onClick={handleCanvasClick}
      >
        {/* Static grid background */}
        <div className="canvas-grid-background">
          {Array.from({ length: totalBars }).map((_, barIdx) => {
            const barX = (barIdx % barsPerRow) * beatsPerBar * gridSize
            const barY = Math.floor(barIdx / barsPerRow) * 200
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
                if (node.type === 'lyric') {
                  handleNodeDragStart(e, node.id)
                }
              }}
            >
              {node.type === 'lyric' ? (
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
                <>
                  <div className="node-header">
                    <span className="node-type-label">Chord</span>
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
                  <div
                    className="node-content-display chord-node-content"
                    onMouseDown={(e) => handleNodeDragStart(e, node.id)}
                  >
                    {formatChordName(node.content)}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default NodeBasedCanvas
