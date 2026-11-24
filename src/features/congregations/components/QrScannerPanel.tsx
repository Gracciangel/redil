import { useEffect, useRef, useState } from 'react'
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'

interface BarcodeDetection {
  rawValue: string
}

interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<BarcodeDetection[]>
}

interface BarcodeDetectorCtor {
  new (options?: { formats?: string[] }): BarcodeDetectorLike
}

function createDetector(): BarcodeDetectorLike | null {
  const Ctor = (globalThis as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector
  if (!Ctor) return null
  return new Ctor({ formats: ['qr_code'] })
}

function messageFrom(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

interface Props {
  /** Recibe el invitation_code leído (o pegado en el fallback manual). */
  onDetect: (code: string) => void
  onCancel: () => void
  error?: string | null
}

/**
 * Escáner QR con `BarcodeDetector` nativo. Si el navegador no lo soporta o la
 * cámara falla, deja un campo manual para pegar el código.
 * No ejecuta RPCs: solo entrega el código al padre.
 */
export function QrScannerPanel({ onDetect, onCancel, error }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const onDetectRef = useRef(onDetect)
  const [supported] = useState(() => createDetector() !== null)
  const [scanning, setScanning] = useState(supported)
  const [camError, setCamError] = useState<string | null>(null)
  const [manualCode, setManualCode] = useState('')

  useEffect(() => {
    onDetectRef.current = onDetect
  }, [onDetect])

  useEffect(() => {
    if (!supported || !scanning) return

    const maybeDetector = createDetector()
    if (!maybeDetector) return
    const detector: BarcodeDetectorLike = maybeDetector

    let stream: MediaStream | null = null
    let timer: number | null = null
    let cancelled = false

    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Este navegador no expone acceso a la cámara.')
        }
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        await video.play()

        timer = window.setInterval(() => {
          const current = videoRef.current
          if (!current || current.readyState < 2 || cancelled) return
          void detector.detect(current).then((codes) => {
            const value = codes[0]?.rawValue?.trim()
            if (value && !cancelled) {
              cancelled = true
              onDetectRef.current(value.toUpperCase())
              setScanning(false)
            }
          }).catch(() => {
            // Un frame ilegible no es un error: se sigue intentando.
          })
        }, 500)
      } catch (e: unknown) {
        if (!cancelled) setCamError(messageFrom(e, 'No se pudo acceder a la cámara.'))
      }
    }

    void start()

    return () => {
      cancelled = true
      if (timer !== null) window.clearInterval(timer)
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [supported, scanning])

  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" color="text.secondary">
        Mostrá el QR que obtuviste en la congregación. El código se canjea automáticamente.
      </Typography>

      {supported && scanning && !camError && (
        <Box
          component="video"
          ref={videoRef}
          playsInline
          muted
          sx={{ width: '100%', borderRadius: 2, bgcolor: 'black', aspectRatio: '4 / 3', objectFit: 'cover' }}
        />
      )}

      {camError && (
        <Alert severity="info">
          No pudimos abrir la cámara ({camError}). Pegá el código de invitación abajo.
        </Alert>
      )}

      {!supported && (
        <Alert severity="info">
          Tu navegador no soporta escaneo QR. Pegá el código de invitación abajo.
        </Alert>
      )}

      {(!supported || !!camError || !scanning) && (
        <Stack direction="row" spacing={1}>
          <TextField
            label="Código de invitación"
            value={manualCode}
            onChange={(event) => setManualCode(event.target.value.toUpperCase())}
            fullWidth
          />
          <Button
            variant="contained"
            onClick={() => onDetect(manualCode.trim().toUpperCase())}
            disabled={!manualCode.trim()}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Canjear
          </Button>
        </Stack>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      <Button startIcon={<ArrowBackIcon />} onClick={onCancel} sx={{ alignSelf: 'flex-start' }}>
        Volver
      </Button>
    </Stack>
  )
}
