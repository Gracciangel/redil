import { Box } from '@mui/material'

/** Acorde coloreado según la nota raíz ya transitada. */
export function ChordChip({ chord, color }: { chord: string; color: string }) {
  return (
    <Box
      component="span"
      title={chord}
      sx={{
        display: 'inline-block', px: 0.7, mr: 0.6, borderRadius: 1,
        fontFamily: 'monospace', fontWeight: 700, fontSize: '0.82rem',
        lineHeight: 1.6, color, bgcolor: 'rgba(255,255,255,0.06)',
        border: '1px solid', borderColor: 'rgba(255,255,255,0.12)',
      }}
    >
      {chord}
    </Box>
  )
}
