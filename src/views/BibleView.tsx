import { Box, Paper, Typography } from '@mui/material'
import { EmptyState } from '@/components/Feedback'

/**
 * Biblia (reglas de vistas): el módulo debe estar presente para ambos perfiles,
 * pero todavía no hay una fuente de datos definida. Vista pura, sin RPCs.
 */
export function BibleView() {
  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="overline" color="primary.main" sx={{ fontWeight: 700, letterSpacing: '0.14em' }}>
          Espiritual
        </Typography>
        <Typography variant="h4" component="h1">Biblia</Typography>
      </Box>

      <Paper variant="outlined" sx={{ p: 3 }}>
        <EmptyState
          icon="book"
          title="Módulo en preparación"
          description="Acá vas a poder leer la Biblia y el versículo del día. Falta definir de dónde se cargan los textos."
        />
      </Paper>
    </Box>
  )
}
