import { useState } from 'react'
import { Alert, Box, Button, Chip, Paper, Stack, Typography } from '@mui/material'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import { LoadingList } from '@/components/Feedback'
import { usePastorCongregation } from '../hooks/usePastorCongregation'
import { credentialLabel, credentialsOf, isImageCredential } from '../lib/credentials'
import { PastorCongregationDialog } from './PastorCongregationDialog'

/** Se muestra solo en el perfil del tenant; la edición vive en la misma tarjeta. */
export function PastorCongregationCard() {
  const { pastor, loading, error, notice, busy, save } = usePastorCongregation()
  const [editing, setEditing] = useState(false)

  const credentials = pastor ? credentialsOf(pastor) : []
  const fullName = pastor ? [pastor.name, pastor.surname].filter(Boolean).join(' ').trim() : ''

  return (
    <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="overline" color="primary.main" sx={{ fontWeight: 700, letterSpacing: '0.12em' }}>
            Pastor de la congregación
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{fullName || 'Sin datos cargados'}</Typography>
        </Box>
        <Button startIcon={<EditOutlinedIcon />} size="small" onClick={() => setEditing(true)}>
          {pastor?.isComplete ? 'Editar' : 'Completar'}
        </Button>
      </Stack>

      {notice && <Alert severity={notice.tone === 'ok' ? 'success' : 'error'} sx={{ mt: 1 }}>{notice.text}</Alert>}
      {error && <Alert severity="error" sx={{ mt: 1 }}>{error.message}</Alert>}
      {loading ? <LoadingList rows={2} /> : (
        <>
          {pastor?.bio && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, whiteSpace: 'pre-line' }}>
              {pastor.bio}
            </Typography>
          )}
          {credentials.length > 0 && (
            <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', gap: 1 }}>
              {credentials.map((url, index) => (
                <Box key={`${url}-${index}`} component="a" href={url} target="_blank" rel="noreferrer">
                  {isImageCredential(url) ? (
                    <Box
                      component="img"
                      src={url}
                      alt={credentialLabel(index)}
                      sx={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
                    />
                  ) : <Chip label={credentialLabel(index)} size="small" />}
                </Box>
              ))}
            </Stack>
          )}
        </>
      )}

      {pastor && (
        <PastorCongregationDialog
          open={editing}
          pastor={pastor}
          busy={busy !== null}
          onClose={() => setEditing(false)}
          onSave={(input) => { void save(input) }}
        />
      )}
    </Paper>
  )
}
