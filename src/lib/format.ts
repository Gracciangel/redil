const timeFormatter = new Intl.DateTimeFormat('es', {
  hour: '2-digit',
  minute: '2-digit',
})

const longDateFormatter = new Intl.DateTimeFormat('es', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

const shortDateFormatter = new Intl.DateTimeFormat('es', {
  day: 'numeric',
  month: 'short',
})

const monthFormatter = new Intl.DateTimeFormat('es', { month: 'short' })
const weekdayFormatter = new Intl.DateTimeFormat('es', { weekday: 'short' })
const relativeFormatter = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function formatLongDate(value: string | Date = new Date()): string {
  return capitalize(longDateFormatter.format(new Date(value)))
}

export function formatShortDate(value: string | Date): string {
  return shortDateFormatter.format(new Date(value))
}

export function formatTime(value: string | Date): string {
  return timeFormatter.format(new Date(value))
}

export function formatTimeRange(startsAt: string, durationMinutes: number): string {
  const start = new Date(startsAt)
  const end = new Date(start.getTime() + durationMinutes * 60_000)
  return `${timeFormatter.format(start)}–${timeFormatter.format(end)}`
}

/** "Hoy", "Mañana" o el día de la semana con la fecha. */
export function formatEventDay(startsAt: string): string {
  const date = new Date(startsAt)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  const dayDiff = Math.round((target.getTime() - today.getTime()) / 86_400_000)

  if (dayDiff === 0) return 'Hoy'
  if (dayDiff === 1) return 'Mañana'
  return capitalize(longDateFormatter.format(date))
}

export interface DateBadge {
  weekday: string
  day: string
  month: string
}

export function dateBadge(startsAt: string): DateBadge {
  const date = new Date(startsAt)
  return {
    weekday: capitalize(weekdayFormatter.format(date).replace('.', '')),
    day: String(date.getDate()),
    month: capitalize(monthFormatter.format(date).replace('.', '')),
  }
}

export function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.round(diffMs / 60_000)

  if (Math.abs(minutes) < 60) return relativeFormatter.format(-minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return relativeFormatter.format(-hours, 'hour')
  const days = Math.round(hours / 24)
  if (Math.abs(days) < 7) return relativeFormatter.format(-days, 'day')
  return formatShortDate(iso)
}

/** Convierte un ISO a un valor válido para <input type="datetime-local">. */
export function toDateTimeLocalValue(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`
}

export function fromDateTimeLocalValue(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/** Parte fecha local (`YYYY-MM-DD`) de un ISO, sin correr por timezone. */
export function toDateInputValue(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Parte hora local (`HH:mm`) de un ISO. */
export function toTimeInputValue(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Junta fecha y hora elegidas en el formulario y devuelve un ISO local. */
export function fromDateAndTime(dateValue: string, timeValue: string): string | null {
  if (!dateValue || !timeValue) return null
  const date = new Date(`${dateValue}T${timeValue}`)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/** Próxima hora redonda, usada como valor inicial al crear desde el calendario. */
export function nextHourTimeValue(): string {
  const date = new Date()
  date.setMinutes(0, 0, 0)
  date.setHours(date.getHours() + 1)
  return toTimeInputValue(date)
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]?.slice(0, 2).toUpperCase() ?? '?'
  const first = parts[0]?.charAt(0) ?? ''
  const last = parts[parts.length - 1]?.charAt(0) ?? ''
  return `${first}${last}`.toUpperCase()
}

export function avatarTone(name: string): number {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) % 5
  return hash
}

export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}
