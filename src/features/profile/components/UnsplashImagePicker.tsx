import { useState } from 'react'
import { Alert, Box, Button, CircularProgress, ImageList, ImageListItem, Stack, TextField, Typography } from '@mui/material'
import { useUnsplashPicker } from '../hooks/useUnsplashPicker'
import type { UnsplashPhoto, UnsplashVariant } from '../services/unsplash'

interface Props {
  variant: UnsplashVariant
  value: string | null
  onSelect: (url: string | null) => void
  autoFocus?: boolean
}

const LABELS = {
  photo: { title: 'Foto de perfil', search: 'Buscar fotos en Unsplash', clear: 'Quitar foto', alt: 'Foto seleccionada' },
  banner: { title: 'Portada', search: 'Buscar portadas en Unsplash', clear: 'Quitar portada', alt: 'Portada seleccionada' },
} as const

/** Selector de imagen: elige en Unsplash y guarda solo la URL. */
export function UnsplashImagePicker({ variant, value, onSelect, autoFocus }: Props) {
  const picker = useUnsplashPicker(variant)
  const [selected, setSelected] = useState<UnsplashPhoto | null>(null)
  const labels = LABELS[variant]

  function choose(photo: UnsplashPhoto) {
    setSelected(photo)
    onSelect(photo.regularUrl)
  }

  function clear() {
    setSelected(null)
    onSelect(null)
  }

  const previewSx = variant === 'photo'
    ? { width: 96, height: 96, borderRadius: '50%', objectFit: 'cover' as const }
    : { width: '100%', height: 110, objectFit: 'cover' as const, borderRadius: 1 }

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2">{labels.title}</Typography>
      {value && <Box component="img" src={value} alt={labels.alt} sx={previewSx} />}
      {selected && (
        <Typography variant="caption" color="text.secondary">
          Foto de{' '}
          <a href={selected.pageUrl} target="_blank" rel="noreferrer">{selected.photographer}</a>{' '}
          en Unsplash
        </Typography>
      )}
      <Button size="small" onClick={clear} disabled={!value} sx={{ alignSelf: 'flex-start' }}>
        {labels.clear}
      </Button>

      {!picker.hasKey ? (
        <Alert severity="info">
          Agregá <code>VITE_UNSPLASH_ACCESS_KEY</code> a <code>.env</code> y reiniciá el servidor.
        </Alert>
      ) : (
        <>
          <Stack direction="row" spacing={1}>
            <TextField
              size="small" label={labels.search} value={picker.query}
              onChange={(event) => picker.setQuery(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') picker.search() }}
              autoFocus={autoFocus} fullWidth
            />
            <Button variant="outlined" onClick={picker.search} disabled={picker.loading}>Buscar</Button>
          </Stack>
          {picker.error && <Alert severity="error">{picker.error}</Alert>}
          {picker.loading ? (
            <CircularProgress size={26} />
          ) : (
            <ImageList cols={3} gap={8} sx={{ m: 0, maxHeight: 210, overflowY: 'auto' }}>
              {picker.photos.map((photo) => (
                <ImageListItem
                  key={photo.id} onClick={() => choose(photo)} title={photo.photographer}
                  sx={{ cursor: 'pointer', border: 2, borderColor: value === photo.regularUrl ? 'primary.main' : 'transparent' }}
                >
                  <img src={photo.thumbUrl} alt={photo.photographer} loading="lazy" />
                </ImageListItem>
              ))}
            </ImageList>
          )}
        </>
      )}
    </Stack>
  )
}
