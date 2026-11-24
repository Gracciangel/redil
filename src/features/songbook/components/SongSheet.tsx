import { Box, Typography } from '@mui/material'
import type { Notation } from '../types'
import { colorForChord, parseChordPro, transposeChord } from '../lib/chords'
import { ChordChip } from './ChordChip'

interface Props {
  content: string
  semitones: number
  notation: Notation
}

/** Letra con acordes ChordPro: `[C]texto` se renderiza como chip coloreado. */
export function SongSheet({ content, semitones, notation }: Props) {
  const lines = parseChordPro(content)

  return (
    <Box sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', lineHeight: 2 }}>
      {lines.map((line, index) => (
        <Typography key={index} component="p" sx={{ m: 0, minHeight: '1.4em' }}>
          {line.segments.map((segment, position) => segment.chord ? (
            <ChordChip
              key={position}
              chord={transposeChord(segment.chord, semitones, notation)}
              color={colorForChord(segment.chord, semitones)}
            />
          ) : (
            <span key={position}>{segment.text}</span>
          ))}
        </Typography>
      ))}
    </Box>
  )
}
