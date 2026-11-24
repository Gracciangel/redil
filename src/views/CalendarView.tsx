import { Alert, Box, Button, Chip, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import TodayOutlinedIcon from '@mui/icons-material/TodayOutlined'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState, LoadingList } from '@/components/Feedback'
import { EntityIcon } from '@/features/congregations/components/EntityIcon'
import { useCalendarView } from '@/features/calendar/hooks/useCalendarView'
import { EventFormDialog } from '@/features/events/components/EventFormDialog'
import { formatLongDate, formatTimeRange, pluralize } from '@/lib/format'

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function monthLabel(date: Date): string {
  const text = new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' }).format(date)
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/**
 * Calendario mensual. Al elegir una fecha se pueden crear, editar o eliminar
 * actividades de ese día, con fecha y horario explícitos. Vista pura: todo
 * viene de `useCalendarView`.
 */
export function CalendarView() {
  const vm = useCalendarView()

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="overline" color="primary.main" sx={{ fontWeight: 700, letterSpacing: '0.14em' }}>
          Organización
        </Typography>
        <Typography variant="h4" component="h1">Calendario</Typography>
        <Typography color="text.secondary">
          Elegí un día para ver sus actividades o agregar una nueva con horario.
        </Typography>
      </Box>

      {vm.error && <Alert severity="error" sx={{ mb: 2 }}>{vm.error.message}</Alert>}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: 'stretch' }}>
        <Paper variant="outlined" sx={{ p: 2, flex: 3, minWidth: 0 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <IconButton onClick={() => vm.goToMonth(-1)} aria-label="Mes anterior" size="small">
              <ChevronLeftIcon />
            </IconButton>
            <Typography sx={{ fontWeight: 700 }}>{monthLabel(vm.visible)}</Typography>
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="Ir a hoy">
                <IconButton onClick={vm.goToToday} aria-label="Ir a hoy" size="small">
                  <TodayOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <IconButton onClick={() => vm.goToMonth(1)} aria-label="Mes siguiente" size="small">
                <ChevronRightIcon />
              </IconButton>
            </Stack>
          </Stack>

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 0.5, mb: 0.5 }}>
            {WEEKDAYS.map((label) => (
              <Typography key={label} align="center" variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                {label}
              </Typography>
            ))}
          </Box>

          {vm.loading && vm.events.length === 0 ? (
            <LoadingList rows={4} />
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 0.5 }}>
              {vm.days.map((day) => (
                <Button
                  key={day.key}
                  onClick={() => vm.selectDay(day)}
                  variant={day.key === vm.selectedKey ? 'contained' : 'text'}
                  size="small"
                  sx={{
                    minWidth: 0,
                    height: { xs: 44, sm: 56 },
                    flexDirection: 'column',
                    lineHeight: 1.1,
                    px: 0.5,
                    color: day.inMonth ? 'inherit' : 'text.disabled',
                    border: day.isToday && day.key !== vm.selectedKey ? '1px solid' : '1px solid transparent',
                    borderColor: 'primary.main',
                  }}
                  aria-label={`${formatLongDate(day.date)}${day.eventCount ? `, ${pluralize(day.eventCount, 'actividad', 'actividades')}` : ''}`}
                >
                  <span>{day.day}</span>
                  {day.eventCount > 0 && (
                    <Typography variant="caption" sx={{ fontSize: '0.62rem', lineHeight: 1 }}>
                      {day.eventCount} {day.eventCount === 1 ? 'act.' : 'acts.'}
                    </Typography>
                  )}
                </Button>
              ))}
            </Box>
          )}

          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 2 }}>
            <EntityIcon kind="events" color="primary" fontSize="small" />
            <Typography variant="body2" color="text.secondary">
              {pluralize(vm.monthEventCount, 'actividad', 'actividades')} en {monthLabel(vm.visible).toLowerCase()}
            </Typography>
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, flex: 2, minWidth: 0 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
            <EntityIcon kind="events" color="primary" />
            <Box>
              <Typography variant="h6" sx={{ fontSize: '1rem' }}>Fecha seleccionada</Typography>
              <Typography variant="body2" color="text.secondary">{formatLongDate(vm.selectedDate)}</Typography>
            </Box>
          </Stack>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            fullWidth
            sx={{ my: 2 }}
            onClick={(event) => {
              event.currentTarget.blur()
              vm.openCreate()
            }}
          >
            Nueva actividad
          </Button>

          {vm.selectedEvents.length === 0 ? (
            <EmptyState
              icon="calendar"
              title="Sin actividades"
              description="No hay nada cargado para este día. Podés agregar una actividad con su horario."
            />
          ) : (
            <Stack spacing={1.25}>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.1em' }}>
                {pluralize(vm.selectedEvents.length, 'actividad', 'actividades')}
              </Typography>
              {vm.selectedEvents.map((event) => (
                <Paper key={event.id} variant="outlined" sx={{ p: 1.5 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                        <Typography sx={{ fontWeight: 600 }}>{event.title}</Typography>
                        <Chip size="small" label={formatTimeRange(event.startsAt, event.durationMinutes)} />
                      </Stack>
                      {event.location && (
                        <Typography variant="body2" color="text.secondary">{event.location}</Typography>
                      )}
                      {event.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{event.description}</Typography>
                      )}
                    </Box>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="Editar">
                        <IconButton
                          size="small"
                          onClick={(click) => {
                            click.currentTarget.blur()
                            vm.setEditing(event)
                          }}
                          aria-label={`Editar ${event.title}`}
                        >
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => vm.setDeleting(event)}
                          aria-label={`Eliminar ${event.title}`}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </Paper>
      </Stack>

      <EventFormDialog
        open={vm.creating || vm.editing !== null}
        event={vm.editing}
        initialDate={vm.selectedKey}
        onClose={vm.closeDialogs}
      />
      <ConfirmDialog
        open={vm.deleting !== null}
        title="Eliminar actividad"
        message={vm.deleting ? `Se eliminará «${vm.deleting.title}» del calendario. Esta acción no se puede deshacer.` : ''}
        confirmLabel="Eliminar"
        busyLabel="Eliminando…"
        onCancel={() => vm.setDeleting(null)}
        onConfirm={() => void vm.handleConfirmDelete()}
      />
    </Box>
  )
}
