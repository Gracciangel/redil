import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { Alert, Box, Button, Paper, Stack, Typography } from '@mui/material'
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import QrCode2OutlinedIcon from '@mui/icons-material/QrCode2Outlined'
import { useCongregationCode } from '@/features/congregations/hooks/useCongregationCode'

/**
 * Vista del Code del tenant (reglas de vistas, `rulesView.md`).
 *
 * Es SOLO una view: muestra el `invitation_code` que ya existe y su QR. No
 * genera códigos nuevos, no llama a Supabase y no decide permisos. Los datos
 * vienen del hook `useCongregationCode`, que lee la sesión persistida.
 */
export function CodeView() {
  const vm = useCongregationCode()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 2200)
    return () => window.clearTimeout(timer)
  }, [copied])

  // Code es una vista exclusiva del tenant.
  if (!vm.congregation) {
    return <Navigate to="/login" replace />
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(vm.code)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="overline" color="primary.main" sx={{ fontWeight: 700, letterSpacing: '0.14em' }}>
          Accesos
        </Typography>
        <Typography variant="h4" component="h1">Code</Typography>
        <Typography color="text.secondary">
          Compartí este QR o el código para que otras personas se unan a {vm.name || 'tu congregación'}.
        </Typography>
      </Box>

      {!vm.code ? (
        <Alert severity="warning">
          No hay un código de invitación en la sesión actual. Volvé a iniciar sesión como congregación
          para cargarlo.
        </Alert>
      ) : (
        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, maxWidth: 560, mx: 'auto' }}>
          <Stack spacing={2} sx={{ alignItems: 'center' }}>
            <Stack direction="row" spacing={1} sx={{ alignSelf: 'flex-start', alignItems: 'center' }}>
              <QrCode2OutlinedIcon color="primary" />
              <Typography variant="h6" sx={{ fontSize: '1rem' }}>
                Código de invitación
              </Typography>
            </Stack>

            <Box
              sx={{
                p: 2,
                bgcolor: 'common.white',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                display: 'inline-flex',
              }}
            >
              <QRCodeSVG value={vm.code} size={220} level="M" />
            </Box>

            <Box
              sx={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1.5,
                flexWrap: 'wrap',
                p: 1.5,
                borderRadius: 2,
                bgcolor: 'action.hover',
              }}
            >
              <Typography
                component="span"
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '1.75rem',
                  fontWeight: 700,
                  letterSpacing: '0.22em',
                  userSelect: 'all',
                }}
              >
                {vm.code}
              </Typography>
              <Button
                size="small"
                variant="outlined"
                startIcon={<ContentCopyOutlinedIcon />}
                onClick={() => void handleCopy()}
              >
                {copied ? 'Copiado' : 'Copiar'}
              </Button>
            </Box>

            <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', textAlign: 'left' }}>
              <InfoOutlinedIcon color="action" fontSize="small" />
              <Typography variant="body2" color="text.secondary">
                El QR contiene exactamente este mismo código. Si el escáner no funciona, pueden
                escribirlo a mano desde “Ingresar mediante código de invitación”. Cada persona solo
                puede unirse a una congregación.
              </Typography>
            </Stack>
          </Stack>
        </Paper>
      )}
    </Box>
  )
}
