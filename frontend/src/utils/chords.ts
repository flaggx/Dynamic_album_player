import { ChordVoicing } from '../types'

// Musical keys
export const MUSICAL_KEYS = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'
]

// Roman numeral progressions
export const ROMAN_NUMERALS = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']

// Chord progression mapping: key -> Roman numeral -> actual chord
export const getChordFromProgression = (key: string, romanNumeral: string): string => {
  const keyIndex = MUSICAL_KEYS.indexOf(key)
  if (keyIndex === -1) return 'C'

  const majorScale = [0, 2, 4, 5, 7, 9, 11] // Semitones for major scale
  const numeralMap: Record<string, number> = {
    'I': 0,
    'ii': 1,
    'iii': 2,
    'IV': 3,
    'V': 4,
    'vi': 5,
    'vii°': 6,
  }

  const scaleDegree = numeralMap[romanNumeral]
  if (scaleDegree === undefined) return 'C'

  const semitone = majorScale[scaleDegree]
  const chordIndex = (keyIndex + semitone) % 12
  return MUSICAL_KEYS[chordIndex]
}

// Common chord voicings library
export const CHORD_VOICINGS: Record<string, ChordVoicing[]> = {
  'C': [
    { name: 'Open C', frets: [-1, 3, 2, 0, 1, 0], baseFret: 0 },
    { name: 'C Major', frets: [3, 3, 2, 0, 1, 0], baseFret: 0 },
    { name: 'C Barre', frets: [3, 3, 5, 5, 5, 3], baseFret: 3 },
  ],
  'C#': [
    { name: 'C# Barre', frets: [4, 4, 6, 6, 6, 4], baseFret: 4 },
    { name: 'C# Major', frets: [-1, 4, 3, 1, 2, 1], baseFret: 1 },
  ],
  'D': [
    { name: 'Open D', frets: [-1, 0, 0, 2, 3, 2], baseFret: 0 },
    { name: 'D Major', frets: [-1, 5, 5, 7, 7, 5], baseFret: 5 },
    { name: 'D Barre', frets: [5, 5, 7, 7, 7, 5], baseFret: 5 },
  ],
  'D#': [
    { name: 'D# Barre', frets: [6, 6, 8, 8, 8, 6], baseFret: 6 },
  ],
  'E': [
    { name: 'Open E', frets: [0, 2, 2, 1, 0, 0], baseFret: 0 },
    { name: 'E Major', frets: [0, 2, 2, 1, 0, 0], baseFret: 0 },
    { name: 'E Barre', frets: [0, 2, 2, 4, 4, 0], baseFret: 0 },
  ],
  'F': [
    { name: 'F Barre', frets: [1, 3, 3, 2, 1, 1], baseFret: 1 },
    { name: 'F Major', frets: [-1, -1, 3, 2, 1, 1], baseFret: 1 },
  ],
  'F#': [
    { name: 'F# Barre', frets: [2, 4, 4, 3, 2, 2], baseFret: 2 },
  ],
  'G': [
    { name: 'Open G', frets: [3, 0, 0, 0, 0, 3], baseFret: 0 },
    { name: 'G Major', frets: [3, 2, 0, 0, 3, 3], baseFret: 0 },
    { name: 'G Barre', frets: [3, 5, 5, 4, 3, 3], baseFret: 3 },
  ],
  'G#': [
    { name: 'G# Barre', frets: [4, 6, 6, 5, 4, 4], baseFret: 4 },
  ],
  'A': [
    { name: 'Open A', frets: [0, 0, 2, 2, 2, 0], baseFret: 0 },
    { name: 'A Major', frets: [5, 7, 7, 6, 5, 5], baseFret: 5 },
    { name: 'A Barre', frets: [5, 5, 7, 7, 7, 5], baseFret: 5 },
  ],
  'A#': [
    { name: 'A# Barre', frets: [6, 6, 8, 8, 8, 6], baseFret: 6 },
  ],
  'B': [
    { name: 'B Barre', frets: [7, 7, 9, 9, 9, 7], baseFret: 7 },
    { name: 'B Major', frets: [-1, 2, 4, 4, 4, 2], baseFret: 2 },
  ],
  // Minor chords
  'Am': [
    { name: 'Open Am', frets: [-1, 0, 2, 2, 1, 0], baseFret: 0 },
    { name: 'Am Barre', frets: [5, 5, 7, 7, 6, 5], baseFret: 5 },
  ],
  'A#m': [
    { name: 'A#m Barre', frets: [6, 6, 8, 8, 7, 6], baseFret: 6 },
  ],
  'Bm': [
    { name: 'Bm Barre', frets: [7, 7, 9, 9, 8, 7], baseFret: 7 },
  ],
  'Cm': [
    { name: 'Cm Barre', frets: [3, 3, 5, 5, 4, 3], baseFret: 3 },
  ],
  'C#m': [
    { name: 'C#m Barre', frets: [4, 4, 6, 6, 5, 4], baseFret: 4 },
  ],
  'Dm': [
    { name: 'Open Dm', frets: [-1, 0, 0, 2, 3, 1], baseFret: 0 },
    { name: 'Dm Barre', frets: [5, 5, 7, 7, 6, 5], baseFret: 5 },
  ],
  'D#m': [
    { name: 'D#m Barre', frets: [6, 6, 8, 8, 7, 6], baseFret: 6 },
  ],
  'Em': [
    { name: 'Open Em', frets: [0, 2, 2, 0, 0, 0], baseFret: 0 },
    { name: 'Em Barre', frets: [0, 2, 2, 0, 0, 0], baseFret: 0 },
  ],
  'Fm': [
    { name: 'Fm Barre', frets: [1, 3, 3, 1, 1, 1], baseFret: 1 },
  ],
  'F#m': [
    { name: 'F#m Barre', frets: [2, 4, 4, 2, 2, 2], baseFret: 2 },
  ],
  'Gm': [
    { name: 'Gm Barre', frets: [3, 5, 5, 3, 3, 3], baseFret: 3 },
  ],
  'G#m': [
    { name: 'G#m Barre', frets: [4, 6, 6, 4, 4, 4], baseFret: 4 },
  ],
}

// Get voicings for a chord (including minor variants)
export const getChordVoicings = (chordName: string): ChordVoicing[] => {
  // Check for minor chords
  if (chordName.endsWith('m') || chordName.endsWith('min')) {
    const baseChord = chordName.replace(/m|min$/, '')
    const minorChord = `${baseChord}m`
    return CHORD_VOICINGS[minorChord] || CHORD_VOICINGS[chordName] || []
  }
  
  // Check for major chords
  const voicings = CHORD_VOICINGS[chordName]
  if (voicings && voicings.length > 0) {
    return voicings
  }
  
  // If no voicings found, return a default open chord based on the chord name
  // This is a fallback for chords not in our library
  return [{
    name: 'Open',
    frets: [0, 0, 0, 0, 0, 0],
    baseFret: 0,
  }]
}

// Convert chord name to display format
export const formatChordName = (chord: string | undefined | null): string => {
  if (!chord) return 'C'
  return chord.replace('#', '♯').replace('b', '♭')
}

// Generate tab notation for a chord
export const generateChordTab = (voicing: ChordVoicing): string => {
  const strings = ['E', 'A', 'D', 'G', 'B', 'e']
  const lines: string[] = []
  
  // Find the highest fret to determine spacing
  const maxFret = Math.max(...voicing.frets.filter(f => f >= 0))
  const minFret = Math.min(...voicing.frets.filter(f => f >= 0))
  const useBaseFret = voicing.baseFret !== undefined && voicing.baseFret > 0
  
  if (useBaseFret) {
    lines.push(`${voicing.baseFret}fr`)
  }
  
  // Draw each string
  for (let i = 0; i < strings.length; i++) {
    const fret = voicing.frets[i]
    let line = `${strings[i]} |`
    
    if (fret === -1) {
      line += ' X'
    } else if (fret === 0) {
      line += ' 0'
    } else {
      const displayFret = useBaseFret ? fret - voicing.baseFret! : fret
      line += ` ${displayFret}`
    }
    
    lines.push(line)
  }
  
  return lines.join('\n')
}

