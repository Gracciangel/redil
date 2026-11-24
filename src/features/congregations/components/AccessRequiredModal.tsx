import { useState } from 'react'
import { Alert, Button, Dialog, DialogContent, DialogTitle, Stack, Typography } from '@mui/material'
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner'
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import type { CongregationPreview } from '@/features/congregations/services/membership'
import { JoinCongregationPanel } from './JoinCongregationPanel'
import { QrScannerPanel } from './QrScannerPanel'

type Mode = 'choose' | 'qr' | 'code'

interface Props {
  code: string
  onCodeChange: (value: string) => void
  onPreview: (code?: string) => void
  onJoin: (code?: string) => void
  preview: CongregationPreview | null
  previewing: boolean
  joining: boolean
  error: string | null
  joinedCongregationId: string | null
  membershipError?: Error | null
  /** Sale de R7: cierra sesión, limpia el storage y vuelve al login. */
  onExit: () => void
}

/**
 * Modal bloqueante de R7: es la única UI visible para un miembro autenticado
 * que todavía no pertenece a ningún tenant.
 *
 * No ejecuta RPCs: delega en el viewmodel `useMemberHome`. Reutiliza
 * `JoinCongregationPanel` para el ingreso por código y `QrScannerPanel` para el
 * ingreso por QR. No tiene cierre: solo desaparece cuando la membresía existe.
 */
export function AccessRequiredModal({
  code,
  onCodeChange,
  onPreview,
  onJoin,
  preview,
  previewing,
  joining,
  error,
  joinedCongregationId,
  membershipError,
  onExit,
}: Props) {
  const [mode, setMode] = useState<Mode>('choose')

  return (
    // Sin `onClose`, MUI v9 no cierra el diálogo con Escape ni con backdrop:
    // se sale con «Volver al inicio» (onExit) o cuando existe la membresía.
    <Dialog open fullWidth maxWidth="xs" aria-labelledby="access-required-title">
      <DialogTitle id="access-required-title" style={{
        textAlign:"center"
      }}>Necesitás ser parte de una congregación</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          {membershipError && (
            <Alert severity="info" style={{
              textAlign:'center'
            }}>
              Todavía no pudimos verificar tu membresía. Ingresá el código o escanea un QR.
            </Alert>
          )}

          {mode === 'choose' && (
            <>
              <Typography variant="body2" color="text.secondary">
                Tu cuenta de Redil no está asociada a ninguna congregación. Pedile el QR o el código de
                invitación al dueño de casa para acceder a las opciones y a tu perfil de miembro.
              </Typography>
              <Stack spacing={1}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<QrCodeScannerIcon />}
                  onClick={() => setMode('qr')}
                  fullWidth
                >
                  Ingresar con QR
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<KeyOutlinedIcon />}
                  onClick={() => setMode('code')}
                  fullWidth
                >
                  Ingresar mediante código de invitación
                </Button>
              </Stack>
            </>
          )}

          {mode === 'qr' && (
            <QrScannerPanel
              onDetect={(value) => onJoin(value)}
              onCancel={() => setMode('choose')}
              error={error}
            />
          )}

          {mode === 'code' && (
            <>
              <JoinCongregationPanel
                code={code}
                onCodeChange={onCodeChange}
                onPreview={() => onPreview()}
                onJoin={() => onJoin()}
                preview={preview}
                previewing={previewing}
                joining={joining}
                error={error}
                joinedCongregationId={joinedCongregationId}
              />
              <Button startIcon={<ArrowBackIcon />} onClick={() => setMode('choose')} sx={{ alignSelf: 'flex-start' }}>
                Volver a opciones
              </Button>
            </>
          )}

          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
            ¿Entraste con la cuenta equivocada? Volvé al inicio para elegir otro acceso.
          </Typography>
          <Button startIcon={<ArrowBackIcon />} onClick={onExit} size="small" color="inherit" sx={{ alignSelf: 'center' }}>
            Volver al inicio
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  )
}
