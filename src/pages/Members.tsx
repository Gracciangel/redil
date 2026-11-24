import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState, ErrorState, Field, LoadingList, PageHeader } from '@/components/Feedback'
import { Icon } from '@/components/Icons'
import { Modal } from '@/components/Modal'
import { avatarTone, initials, pluralize } from '@/lib/format'
import { useAsyncData } from '@/lib/hooks'
import { deleteMember, listMembers, saveMember, type MemberInput } from '@/lib/repo'
import {
  MEMBER_ROLES,
  ROLE_LABELS,
  type Member,
  type MemberRole,
} from '@/lib/types'

const fold = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

interface MemberFormProps {
  open: boolean
  member: Member | null
  onClose: () => void
}

function MemberForm({ open, member, onClose }: MemberFormProps) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [group, setGroup] = useState('')
  const [role, setRole] = useState<MemberRole>('miembro')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(member?.name ?? '')
    setPhone(member?.phone ?? '')
    setEmail(member?.email ?? '')
    setGroup(member?.group ?? '')
    setRole(member?.role ?? 'miembro')
    setNotes(member?.notes ?? '')
    setError(null)
    setSaving(false)
  }, [open, member])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) {
      setError('El nombre es obligatorio.')
      return
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('El correo electrónico no parece válido.')
      return
    }

    const input: MemberInput = { name, phone, email, group, role, notes }
    setSaving(true)
    setError(null)
    try {
      await saveMember(input, member?.id)
      onClose()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar el miembro.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title={member ? 'Editar miembro' : 'Nuevo miembro'}
      description="Los cambios se guardan en el dispositivo al instante."
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="submit"
            form="member-form"
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </>
      }
    >
      <form id="member-form" className="form" onSubmit={handleSubmit} noValidate>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <Field label="Nombre y apellidos *" htmlFor="member-name">
          <input
            id="member-name"
            className="input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="María González"
            autoComplete="name"
            autoFocus
            required
          />
        </Field>

        <div className="form-row">
          <Field label="Teléfono" htmlFor="member-phone">
            <input
              id="member-phone"
              className="input"
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="600 000 000"
              autoComplete="tel"
            />
          </Field>
          <Field label="Correo" htmlFor="member-email">
            <input
              id="member-email"
              className="input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nombre@ejemplo.com"
              autoComplete="email"
            />
          </Field>
        </div>

        <div className="form-row">
          <Field label="Grupo o ministerio" htmlFor="member-group">
            <input
              id="member-group"
              className="input"
              value={group}
              onChange={(event) => setGroup(event.target.value)}
              placeholder="Alabanza, Jóvenes…"
            />
          </Field>
          <Field label="Rol" htmlFor="member-role">
            <select
              id="member-role"
              className="input"
              value={role}
              onChange={(event) => setRole(event.target.value as MemberRole)}
            >
              {MEMBER_ROLES.map((option) => (
                <option key={option} value={option}>
                  {ROLE_LABELS[option]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Notas" htmlFor="member-notes" hint="Visitas, necesidades, cumpleaños…">
          <textarea
            id="member-notes"
            className="input input-textarea"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
          />
        </Field>
      </form>
    </Modal>
  )
}

export function MembersPage() {
  const { data: members, loading, error } = useAsyncData(listMembers)
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Member | null>(null)
  const [deleting, setDeleting] = useState<Member | null>(null)

  const filtered = useMemo(() => {
    const term = fold(query.trim())
    if (!term) return members ?? []
    return (members ?? []).filter((member) =>
      [member.name, member.group, member.phone, member.email, ROLE_LABELS[member.role]].some(
        (value) => fold(value).includes(term),
      ),
    )
  }, [members, query])

  if (error) return <ErrorState message={error.message} />

  return (
    <div className="page">
      <PageHeader
        title="Miembros"
        subtitle={loading && !members ? 'Cargando…' : pluralize(members?.length ?? 0, 'persona', 'personas')}
        actions={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setCreating(true)}
          >
            <Icon name="plus" size={18} />
            Nuevo miembro
          </button>
        }
      />

      <div className="toolbar">
        <div className="search">
          <Icon name="search" size={18} />
          <input
            className="search-input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre, grupo o teléfono…"
            aria-label="Buscar miembros"
          />
        </div>
      </div>

      {loading && !members ? (
        <LoadingList />
      ) : filtered.length === 0 ? (
        query ? (
          <EmptyState
            icon="search"
            title="Sin resultados"
            description={`Nadie coincide con «${query}».`}
            action={
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setQuery('')}
              >
                Limpiar búsqueda
              </button>
            }
          />
        ) : (
          <EmptyState
            icon="users"
            title="Aún no hay miembros"
            description="Registra a las personas de tu congregación para tener sus datos a mano."
            action={
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setCreating(true)}
              >
                <Icon name="plus" size={18} />
                Añadir el primero
              </button>
            }
          />
        )
      ) : (
        <ul className="member-list">
          {filtered.map((member) => (
            <li key={member.id} className="member-card">
              <span className={`avatar avatar-${avatarTone(member.name)}`}>
                {initials(member.name)}
              </span>

              <div className="member-main">
                <div className="member-top">
                  <h2>{member.name}</h2>
                  <span className={`badge badge-role role-${member.role}`}>
                    {ROLE_LABELS[member.role]}
                  </span>
                </div>

                <div className="member-meta">
                  {member.group && (
                    <span>
                      <Icon name="users" size={14} />
                      {member.group}
                    </span>
                  )}
                  {member.phone && (
                    <a href={`tel:${member.phone.replace(/\s+/g, '')}`}>
                      <Icon name="phone" size={14} />
                      {member.phone}
                    </a>
                  )}
                  {member.email && (
                    <a href={`mailto:${member.email}`}>
                      <Icon name="mail" size={14} />
                      {member.email}
                    </a>
                  )}
                </div>

                {member.notes && <p className="member-notes">{member.notes}</p>}
              </div>

              <div className="row-actions">
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Editar a ${member.name}`}
                  onClick={() => setEditing(member)}
                >
                  <Icon name="edit" size={18} />
                </button>
                <button
                  type="button"
                  className="icon-btn icon-btn-danger"
                  aria-label={`Eliminar a ${member.name}`}
                  onClick={() => setDeleting(member)}
                >
                  <Icon name="trash" size={18} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <MemberForm
        open={creating || editing !== null}
        member={editing}
        onClose={() => {
          setCreating(false)
          setEditing(null)
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Eliminar miembro"
        message={
          deleting
            ? `Se eliminará a ${deleting.name} de este dispositivo. Esta acción no se puede deshacer.`
            : ''
        }
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await deleteMember(deleting.id)
          setDeleting(null)
        }}
      />
    </div>
  )
}
