import type { LyricLine, Notation } from '../types'
import { noteIndex, noteName, NOTE_COLORS } from './notes'

const CHORD = /^([A-Ga-g][#b]?)(.*)$/
const INLINE = /\[([^\]]+)\]/g

/** Separa la nota raíz del sufijo (m, 7, maj7, sus4, /B…). */
export function chordParts(chord: string) {
  const match = CHORD.exec(chord.trim())
  if (!match) return { root: 'C', suffix: chord.trim() }
  return { root: match[1], suffix: match[2] }
}

/** Traslada un acorde y convierte la nota a la notación elegida. */
export function transposeChord(chord: string, semitones: number, notation: Notation): string {
  const { root, suffix } = chordParts(chord)
  const preferFlats = root.includes('b')
  const name = noteName(noteIndex(root) + semitones, preferFlats, notation === 'european')
  return `${name}${suffix}`
}

export function colorForChord(chord: string, semitones: number): string {
  const { root } = chordParts(chord)
  const preferFlats = root.includes('b')
  const note = noteName(noteIndex(root) + semitones, preferFlats, false)
  return NOTE_COLORS[note] ?? NOTE_COLORS.C
}

/** Convierte ChordPro (`[C]texto`) en segmentos listos para renderizar. */
export function parseChordPro(content: string): LyricLine[] {
  return content.split(/\r?\n/).map((line) => {
    const segments: LyricLine['segments'] = []
    let cursor = 0
    for (const match of line.matchAll(INLINE)) {
      const at = match.index ?? 0
      if (at > cursor) segments.push({ chord: null, text: line.slice(cursor, at) })
      segments.push({ chord: match[1], text: '' })
      cursor = at + match[0].length
    }
    if (cursor < line.length) segments.push({ chord: null, text: line.slice(cursor) })
    return { segments }
  })
}
