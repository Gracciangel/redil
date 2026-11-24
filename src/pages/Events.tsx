import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState, ErrorState, Field, LoadingList, PageHeader } from '@/components/Feedback'
import { Icon } from '@/components/Icons'
import { Modal } from '@/components/Modal'
import {
  dateBadge,
  formatEventDay,
  formatTimeRange,
  fromDateTimeLocalValue,
  pluralize,
  toDateTimeLocalValue,
} from '@/lib/format'
import { useAsyncData } from '@/lib/hooks'
import { deleteEvent, listEvents, saveEvent, type EventInput } from '@/lib/repo'
import type { CongregationEvent } from '@/lib/types'

function defaultStartValue(): string {
  const date = new Date()
  date.setMinutes(0, 0, 0)
  date.setHours(date.getHours() + 1)
  return toDateTimeLocalValue(date.toISOString())
}

interface EventFormProps {
  open: boolean
  event: CongregationEvent | null
  onClose: () => void
}

function EventForm({ open, event, onClose }: EventFormProps) {
  const [title, setTitle] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(60)
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setTitle(event?.title ?? '')
    setStartsAt(event ? toDateTimeLocalValue(event.startsAt) : defaultStartValue())
    setDurationMinutes(event?.durationMinutes ?? 60)
    setLocation(event?.location ?? '')
    setDescription(event?.description ?? '')
    setError(null)
    setSaving(false)
  }, [open, event])

  async function handleSubmit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault()
    if (!title.trim()) {
      setError('El título es obligatorio.')
      return
    }
    const iso = fromDateTimeLocalValue(startsAt)
    if (!iso) {
      setError('Indica una fecha y hora válidas.')
      return
    }

    const input: EventInput = {
      title,
      startsAt: iso,
      durationMinutes,
      location,
      description,
    }

    setSaving(true)
    setError(null)
    try {
      await saveEvent(input, event?.id)
      onClose()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar el evento.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title={event ? 'Editar evento' : 'Nuevo evento'}
      description="Se guarda al instante en este dispositivo y se sincroniza después."
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="submit"
            form="event-form"
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </>
      }
    >
      <form id="event-form" className="form" onSubmit={handleSubmit} noValidate>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <Field label="Título *" htmlFor="event-title">
          <input
            id="event-title"
            className="input"
            value={title}
            onChange={(changeEvent) => setTitle(changeEvent.target.value)}
            placeholder="Culto dominical"
            autoFocus
            required
          />
        </Field>

        <div className="form-row">
          <Field label="Fecha y hora *" htmlFor="event-start">
            <input
              id="event-start"
              className="input"
              type="datetime-local"
              value={startsAt}
              onChange={(changeEvent) => setStartsAt(changeEvent.target.value)}
              required
            />
          </Field>
          <Field label="Duración" htmlFor="event-duration">
            <select
              id="event-duration"
              className="input"
              value={durationMinutes}
              onChange={(changeEvent) => setDurationMinutes(Number(changeEvent.target.value))}
            >
              {[30, 45, 60, 75, 90, 120, 180].map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes < 60
                    ? `${minutes} min`
                    : `${minutes / 60} ${minutes === 60 ? 'hora' : 'horas'}`}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Lugar" htmlFor="event-location">
          <input
            id="event-location"
            className="input"
            value={location}
            onChange={(changeEvent) => setLocation(changeEvent.target.value)}
            placeholder="Salón principal"
          />
        </Field>

        <Field label="Descripción" htmlFor="event-description">
          <textarea
            id="event-description"
            className="input input-textarea"
            value={description}
            onChange={(changeEvent) => setDescription(changeEvent.target.value)}
            rows={3}
            placeholder="Detalles del evento, quién participa…"
          />
        </Field>
      </form>
    </Modal>
  )
}

function EventCard({
  event,
  past,
  onEdit,
  onDelete,
}: {
  event: CongregationEvent
  past: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const badge = dateBadge(event.startsAt)

  return (
    <li className={`event-card${past ? ' is-past' : ''}`}>
      <span className="date-badge">
        <span>{badge.weekday}</span>
        <strong>{badge.day}</strong>
        <span>{badge.month}</span>
      </span>

      <div className="event-main">
        <div className="event-top">
          <h2>{event.title}</h2>
          <span className="event-day">{formatEventDay(event.startsAt)}</span>
        </div>
        <div className="event-meta">
          <span>
            <Icon name="clock" size={14} />
            {formatTimeRange(event.startsAt, event.durationMinutes)}
          </span>
          {event.location && (
            <span>
              <Icon name="mapPin" size={14} />
              {event.location}
            </span>
          )}
        </div>
        {event.description && <p className="event-description">{event.description}</p>}
      </div>

      <div className="row-actions">
        <button
          type="button"
          className="icon-btn"
          aria-label={`Editar ${event.title}`}
          onClick={onEdit}
        >
          <Icon name="edit" size={18} />
        </button>
        <button
          type="button"
          className="icon-btn icon-btn-danger"
          aria-label={`Eliminar ${event.title}`}
          onClick={onDelete}
        >
          <Icon name="trash" size={18} />
        </button>
      </div>
    </li>
  )
}

export function EventsPage() {
  const { data: events, loading, error } = useAsyncData(listEvents)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<CongregationEvent | null>(null)
  const [deleting, setDeleting] = useState<CongregationEvent | null>(null)

  const { upcoming, past } = useMemo(() => {
    const now = Date.now()
    const nextList: CongregationEvent[] = []
    const pastList: CongregationEvent[] = []
    for (const event of events ?? []) {
      const end = new Date(event.startsAt).getTime() + event.durationMinutes * 60_000
      if (end >= now) nextList.push(event)
      else pastList.push(event)
    }
    pastList.reverse()
    return { upcoming: nextList, past: pastList }
  }, [events])

  if (error) return <ErrorState message={error.message} />

  return (
    <div className="page">
      <PageHeader
        title="Eventos"
        subtitle={
          loading && !events
            ? 'Cargando…'
            : `${pluralize(upcoming.length, 'próximo', 'próximos')} · ${pluralize(past.length, 'pasado', 'pasados')}`
        }
        actions={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setCreating(true)}
          >
            <Icon name="plus" size={18} />
            Nuevo evento
          </button>
        }
      />

      {loading && !events ? (
        <LoadingList />
      ) : (events?.length ?? 0) === 0 ? (
        <EmptyState
          icon="calendar"
          title="La agenda está vacía"
          description="Crea el primer culto, estudio o actividad de la congregación."
          action={
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setCreating(true)}
            >
              <Icon name="plus" size={18} />
              Crear evento
            </button>
          }
        />
      ) : (
        <>
          <section aria-labelledby="upcoming-title">
            <h2 id="upcoming-title" className="section-title">
              Próximos
            </h2>
            {upcoming.length === 0 ? (
              <p className="section-empty">No hay eventos próximos programados.</p>
            ) : (
              <ul className="event-list">
                {upcoming.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    past={false}
                    onEdit={() => setEditing(event)}
                    onDelete={() => setDeleting(event)}
                  />
                ))}
              </ul>
            )}
          </section>

          {past.length > 0 && (
            <details className="past-events">
              <summary>
                <Icon name="clock" size={16} />
                Eventos pasados ({past.length})
                <Icon name="chevronRight" size={16} className="details-chevron" />
              </summary>
              <ul className="event-list">
                {past.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    past
                    onEdit={() => setEditing(event)}
                    onDelete={() => setDeleting(event)}
                  />
                ))}
              </ul>
            </details>
          )}
        </>
      )}

      <EventForm
        open={creating || editing !== null}
        event={editing}
        onClose={() => {
          setCreating(false)
          setEditing(null)
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Eliminar evento"
        message={
          deleting
            ? `Se eliminará «${deleting.title}» de este dispositivo. Esta acción no se puede deshacer.`
            : ''
        }
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await deleteEvent(deleting.id)
          setDeleting(null)
        }}
      />
    </div>
  )
}
