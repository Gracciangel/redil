import { useEffect, useState, type FormEvent } from 'react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState, ErrorState, Field, LoadingList, PageHeader } from '@/components/Feedback'
import { Icon } from '@/components/Icons'
import { Modal } from '@/components/Modal'
import { pluralize } from '@/lib/format'
import { useAsyncData } from '@/lib/hooks'
import {
  deleteAnnouncement,
  listAnnouncements,
  saveAnnouncement,
  togglePinned,
  type AnnouncementInput,
} from '@/lib/repo'
import type { Announcement } from '@/lib/types'

interface AnnouncementFormProps {
  open: boolean
  announcement: Announcement | null
  onClose: () => void
}

function AnnouncementForm({ open, announcement, onClose }: AnnouncementFormProps) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [pinned, setPinned] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setTitle(announcement?.title ?? '')
    setBody(announcement?.body ?? '')
    setPinned(announcement?.pinned ?? false)
    setError(null)
    setSaving(false)
  }, [open, announcement])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim()) {
      setError('El título es obligatorio.')
      return
    }
    if (!body.trim()) {
      setError('El texto del aviso es obligatorio.')
      return
    }

    const input: AnnouncementInput = { title, body, pinned }
    setSaving(true)
    setError(null)
    try {
      await saveAnnouncement(input, announcement?.id)
      onClose()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar el aviso.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title={announcement ? 'Editar aviso' : 'Nuevo aviso'}
      description="Los avisos fijados aparecen primero en el inicio."
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="submit"
            form="announcement-form"
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? 'Guardando…' : 'Publicar'}
          </button>
        </>
      }
    >
      <form id="announcement-form" className="form" onSubmit={handleSubmit} noValidate>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <Field label="Título *" htmlFor="announcement-title">
          <input
            id="announcement-title"
            className="input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Clases de bautismo"
            autoFocus
            required
          />
        </Field>

        <Field label="Mensaje *" htmlFor="announcement-body">
          <textarea
            id="announcement-body"
            className="input input-textarea"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={5}
            placeholder="Escribe aquí la información que quieres compartir…"
            required
          />
        </Field>

        <label className="checkbox">
          <input
            type="checkbox"
            checked={pinned}
            onChange={(event) => setPinned(event.target.checked)}
          />
          <span>
            Fijar en el inicio
            <small>Se mostrará antes que el resto de avisos.</small>
          </span>
        </label>
      </form>
    </Modal>
  )
}

export function AnnouncementsPage() {
  const { data: announcements, loading, error } = useAsyncData(listAnnouncements)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Announcement | null>(null)
  const [deleting, setDeleting] = useState<Announcement | null>(null)

  if (error) return <ErrorState message={error.message} />

  return (
    <div className="page">
      <PageHeader
        title="Avisos"
        subtitle={
          loading && !announcements
            ? 'Cargando…'
            : pluralize(announcements?.length ?? 0, 'aviso', 'avisos')
        }
        actions={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setCreating(true)}
          >
            <Icon name="plus" size={18} />
            Nuevo aviso
          </button>
        }
      />

      {loading && !announcements ? (
        <LoadingList />
      ) : (announcements?.length ?? 0) === 0 ? (
        <EmptyState
          icon="megaphone"
          title="No hay avisos publicados"
          description="Comparte anuncios, recordatorios y noticias con la congregación."
          action={
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setCreating(true)}
            >
              <Icon name="plus" size={18} />
              Publicar el primero
            </button>
          }
        />
      ) : (
        <ul className="announcement-list">
          {(announcements ?? []).map((announcement) => (
            <li
              key={announcement.id}
              className={`announcement-card${announcement.pinned ? ' is-pinned' : ''}`}
            >
              <div className="announcement-top">
                <h2>{announcement.title}</h2>
                {announcement.pinned && (
                  <span className="badge badge-pinned">
                    <Icon name="pin" size={12} />
                    Fijado
                  </span>
                )}
              </div>

              <p className="announcement-body">{announcement.body}</p>

              <footer className="announcement-footer">
        
                <div className="row-actions">
                  <button
                    type="button"
                    className={`icon-btn${announcement.pinned ? ' is-active' : ''}`}
                    aria-label={
                      announcement.pinned ? 'Quitar de fijados' : 'Fijar en el inicio'
                    }
                    title={announcement.pinned ? 'Quitar de fijados' : 'Fijar en el inicio'}
                    onClick={() => void togglePinned(announcement)}
                  >
                    <Icon name="pin" size={18} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Editar ${announcement.title}`}
                    onClick={() => setEditing(announcement)}
                  >
                    <Icon name="edit" size={18} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn icon-btn-danger"
                    aria-label={`Eliminar ${announcement.title}`}
                    onClick={() => setDeleting(announcement)}
                  >
                    <Icon name="trash" size={18} />
                  </button>
                </div>
              </footer>
            </li>
          ))}
        </ul>
      )}

      <AnnouncementForm
        open={creating || editing !== null}
        announcement={editing}
        onClose={() => {
          setCreating(false)
          setEditing(null)
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Eliminar aviso"
        message={
          deleting
            ? `Se eliminará «${deleting.title}». Esta acción no se puede deshacer.`
            : ''
        }
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await deleteAnnouncement(deleting.id)
          setDeleting(null)
        }}
      />
    </div>
  )
}
