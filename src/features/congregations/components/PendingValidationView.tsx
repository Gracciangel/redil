import { Alert, Box, Button, Paper, Stack, Typography } from '@mui/material'
import { Icon } from '@/components/Icons'

interface Props {
  email: string
  onBack: () => void
}

const STEPS = [
  { label: 'Registro recibido', done: true },
  { label: 'Verificación de datos', done: false },
  { label: 'Acceso habilitado', done: false },
]

/** Estado de espera tras el registro o un login con vify=false. Vista pura. */
export function PendingValidationView({ email, onBack }: Props) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, textAlign: 'center' }} className="slide-transition">
      <Box
        sx={{
          width: 56, height: 56, borderRadius: '50%', mx: 'auto', mb: 1.5,
          bgcolor: 'rgba(29, 155, 240, 0.14)', color: '#1d9bf0',
          display: 'grid', placeItems: 'center',
        }}
      >
        <Icon name="clock" size={30} />
      </Box>

      <Typography variant="h6" sx={{ fontSize: '1.15rem' }}>Tu congregación está en revisión</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
        Recibimos el registro de <strong>{email}</strong>. Estamos verificando los datos antes de habilitar el acceso a Redil.
      </Typography>

      <Stack spacing={1} sx={{ mt: 2, textAlign: 'left' }}>
        {STEPS.map((step, index) => (
          <Stack key={step.label} direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
            <Box
              sx={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700,
                bgcolor: step.done ? '#1d9bf0' : 'rgba(128, 128, 128, 0.25)',
                color: step.done ? '#fff' : 'text.secondary',
              }}
            >
              {step.done ? <Icon name="check" size={14} /> : index + 1}
            </Box>
            <Typography variant="body2" color={step.done ? 'text.primary' : 'text.secondary'}>
              {step.label}
            </Typography>
          </Stack>
        ))}
      </Stack>

      <Alert severity="info" sx={{ mt: 2, textAlign: 'left', py: 0.5 }}>
        No hace falta registrar la congregación de nuevo. Te contactamos cuando la verificación esté aprobada.
      </Alert>

      <Button variant="outlined" size="small" sx={{ mt: 2 }} onClick={onBack}>
        Volver al inicio
      </Button>
    </Paper>
  )
}
