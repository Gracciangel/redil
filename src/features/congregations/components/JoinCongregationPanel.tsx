import { Alert, Button, Chip, Paper, Stack, TextField, Typography } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import HowToRegIcon from '@mui/icons-material/HowToReg'
import type { CongregationPreview } from '@/features/congregations/services/membership'

/**
 * Componente de presentación para el alta por código de invitación.
 *
 * No ejecuta RPCs ni decide permisos: recibe el viewmodel del hook
 * `useMemberHome` y delega cada acción al padre mediante callbacks.
 */
interface Props {
  code: string
  onCodeChange: (value: string) => void
  onPreview: () => void
  onJoin: () => void
  preview: CongregationPreview | null
  previewing: boolean
  joining: boolean
  error: string | null
  joinedCongregationId: string | null
}

export function JoinCongregationPanel({
  code,
  onCodeChange,
  onPreview,
  onJoin,
  preview,
  previewing,
  joining,
  error,
  joinedCongregationId,
}: Props) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ fontSize: '1rem', mb: 0.5 }}>
        Unirme a una congregación
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Ingresá el código que te compartió tu congregación (R1: un miembro pertenece a una sola).
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <TextField
          label="Código de invitación"
          value={code}
          onChange={(event) => onCodeChange(event.target.value.toUpperCase())}
          disabled={previewing || joining || !!joinedCongregationId}
          fullWidth
        />
        <Button
          variant="outlined"
          startIcon={<SearchIcon />}
          onClick={onPreview}
          disabled={previewing || joining || !!joinedCongregationId || !code.trim()}
          sx={{ whiteSpace: 'nowrap' }}
        >
          Buscar
        </Button>
        <Button
          variant="contained"
          startIcon={<HowToRegIcon />}
          onClick={onJoin}
          disabled={previewing || joining || !!joinedCongregationId || !code.trim()}
          sx={{ whiteSpace: 'nowrap' }}
        >
          Unirme
        </Button>
      </Stack>

      {preview && (
        <Stack direction="row" spacing={1} sx={{ mt: 1.5, alignItems: 'center' }}>
          <Chip color="primary" variant="outlined" label={preview.name} />
          {[preview.city, preview.country].filter(Boolean).join(', ') && (
            <Typography variant="body2" color="text.secondary">
              {[preview.city, preview.country].filter(Boolean).join(', ')}
            </Typography>
          )}
        </Stack>
      )}

      {joinedCongregationId && (
        <Alert severity="success" sx={{ mt: 1.5 }}>
          Ya sos parte de la congregación.
        </Alert>
      )}

      {error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}
    </Paper>
  )
}
