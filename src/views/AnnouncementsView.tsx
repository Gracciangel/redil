import { Alert, Box, Button, Grid, Stack, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState, LoadingList } from '@/components/Feedback'
import { pluralize } from '@/lib/format'
import { NewsCard } from '@/features/announcements/components/NewsCard'
import { NewsFormDialog } from '@/features/announcements/components/NewsFormDialog'
import { useAnnouncementsView } from '@/features/announcements/hooks/useAnnouncementsView'

/** Avisos: el tenant administra; el miembro solo lee los de su congregación. */
export function AnnouncementsView() {
  const vm = useAnnouncementsView()

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3, justifyContent: 'space-between', alignItems: { sm: 'flex-end' } }}>
        <Box>
          <Typography variant="h4" component="h1">Avisos</Typography>
          <Typography color="text.secondary">
            {vm.loading && vm.announcements.length === 0
              ? 'Cargando…'
              : pluralize(vm.announcements.length, 'aviso', 'avisos')}
          </Typography>
        </Box>
        {vm.canManage && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={vm.openCreate}>Nuevo aviso</Button>
        )}
      </Stack>

      {vm.notice && (
        <Alert severity={vm.notice.tone === 'ok' ? 'success' : 'error'} sx={{ mb: 2 }}>
          {vm.notice.text}
        </Alert>
      )}
      {vm.error && <Alert severity="error" sx={{ mb: 2 }}>{vm.error.message}</Alert>}

      {vm.loading && vm.announcements.length === 0 ? (
        <LoadingList />
      ) : vm.announcements.length === 0 ? (
        <EmptyState
          icon="megaphone"
          title="No hay avisos publicados"
          description={
            vm.canManage
              ? 'Publicá anuncios, recordatorios y noticias para tu congregación.'
              : 'Las novedades de tu congregación van a aparecer acá.'
          }
          action={vm.canManage ? (
            <Button variant="contained" startIcon={<AddIcon />} onClick={vm.openCreate}>Publicar el primero</Button>
          ) : undefined}
        />
      ) : (
        <Grid container spacing={1.5}>
          {vm.announcements.map((item) => (
            <Grid key={item.id} size={{ xs: 12, md: 6 }}>
              <NewsCard
                item={item}
                onEdit={vm.canManage ? vm.openEdit : undefined}
                onDelete={vm.canManage ? vm.setDeleting : undefined}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <NewsFormDialog
        open={vm.formOpen}
        item={vm.editing}
        busy={vm.busy}
        onSave={(input) => void vm.save(input)}
        onClose={vm.closeForm}
      />
      <ConfirmDialog
        open={vm.deleting !== null}
        title="Eliminar aviso"
        message={vm.deleting ? `Se eliminará «${vm.deleting.title}». Esta acción no se puede deshacer.` : ''}
        onCancel={() => vm.setDeleting(null)}
        onConfirm={() => void vm.remove()}
      />
    </Box>
  )
}
