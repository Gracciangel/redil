import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Stack, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState, LoadingList } from '@/components/Feedback'
import { deleteEvent } from '@/lib/repo'
import { pluralize } from '@/lib/format'
import { useEventsView } from '@/features/events/hooks/useEventsView'
import { EventFormDialog } from '@/features/events/components/EventFormDialog'
import { EventCard } from '@/features/events/components/EventCard'

export function EventsView() {
  const vm = useEventsView()
  if (vm.error) return <Alert severity="error">{vm.error.message}</Alert>

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3, justifyContent: 'space-between', alignItems: { sm: 'flex-end' } }}>
        <Box>
          <Typography variant="h4" component="h1">Eventos</Typography>
          <Typography color="text.secondary">
            {vm.loading && vm.events.length === 0 ? 'Cargando…' : `${pluralize(vm.upcoming.length, 'próximo', 'próximos')} · ${pluralize(vm.past.length, 'pasado', 'pasados')}`}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => vm.setCreating(true)}>Nuevo evento</Button>
      </Stack>

      {vm.loading && vm.events.length === 0 ? (
        <LoadingList />
      ) : vm.events.length === 0 ? (
        <EmptyState
          icon="calendar"
          title="La agenda está vacía"
          description="Crea el primer culto, estudio o actividad de la congregación."
          action={<Button variant="contained" startIcon={<AddIcon />} onClick={() => vm.setCreating(true)}>Crear evento</Button>}
        />
      ) : (
        <>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.1em' }}>Próximos</Typography>
          {vm.upcoming.length === 0 ? (
            <Typography color="text.secondary" sx={{ my: 1.5 }}>No hay eventos próximos programados.</Typography>
          ) : (
            <Stack spacing={1.25} sx={{ mt: 1, mb: 2 }}>
              {vm.upcoming.map((event) => (
                <EventCard key={event.id} event={event} onEdit={() => vm.setEditing(event)} onDelete={() => vm.setDeleting(event)} />
              ))}
            </Stack>
          )}

          {vm.past.length > 0 && (
            <Accordion disableGutters elevation={0} sx={{ mt: 2, bgcolor: 'transparent', '&:before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography sx={{ fontWeight: 600 }}>Eventos pasados ({vm.past.length})</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 0 }}>
                <Stack spacing={1.25}>
                  {vm.past.map((event) => (
                    <EventCard key={event.id} event={event} past onEdit={() => vm.setEditing(event)} onDelete={() => vm.setDeleting(event)} />
                  ))}
                </Stack>
              </AccordionDetails>
            </Accordion>
          )}
        </>
      )}

      <EventFormDialog open={vm.creating || vm.editing !== null} event={vm.editing} onClose={() => { vm.setCreating(false); vm.setEditing(null) }} />
      <ConfirmDialog
        open={vm.deleting !== null}
        title="Eliminar evento"
        message={vm.deleting ? `Se eliminará «${vm.deleting.title}» de este dispositivo. Esta acción no se puede deshacer.` : ''}
        onCancel={() => vm.setDeleting(null)}
        onConfirm={async () => { if (vm.deleting) await deleteEvent(vm.deleting.id); vm.setDeleting(null) }}
      />
    </Box>
  )
}