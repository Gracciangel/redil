import { useMemo, useState } from 'react'
import { useAsyncData } from '@/lib/hooks'
import { bump } from '@/lib/live'
import { deleteEvent, listEvents } from '@/lib/repo'
import type { CongregationEvent } from '@/lib/types'

export interface CalendarDay {
  key: string
  date: Date
  day: number
  inMonth: boolean
  isToday: boolean
  eventCount: number
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function fromKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1)
}

function monthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function buildDays(visible: Date, events: CongregationEvent[]): CalendarDay[] {
  const counts = new Map<string, number>()
  for (const event of events) {
    const key = dateKey(new Date(event.startsAt))
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const first = monthStart(visible)
  // Lunes = 0. Así la grilla arranca siempre en lunes.
  const offset = (first.getDay() + 6) % 7
  const gridStart = new Date(first.getFullYear(), first.getMonth(), first.getDate() - offset)
  const today = dateKey(new Date())

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index)
    const key = dateKey(date)
    return {
      key,
      date,
      day: date.getDate(),
      inMonth: date.getMonth() === visible.getMonth() && date.getFullYear() === visible.getFullYear(),
      isToday: key === today,
      eventCount: counts.get(key) ?? 0,
    }
  })
}

/**
 * Viewmodel del Calendario: grilla mensual, fecha seleccionada y acciones
 * (crear/editar/eliminar) sobre esa fecha. Los eventos siguen en el repo local.
 */
export function useCalendarView() {
  const { data, loading, error } = useAsyncData(listEvents)
  const events = data ?? []

  const [visible, setVisible] = useState(() => monthStart(new Date()))
  const [selectedKey, setSelectedKey] = useState(() => dateKey(new Date()))
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<CongregationEvent | null>(null)
  const [deleting, setDeleting] = useState<CongregationEvent | null>(null)

  const days = useMemo(() => buildDays(visible, events), [visible, events])

  const selectedEvents = useMemo(
    () =>
      events
        .filter((event) => dateKey(new Date(event.startsAt)) === selectedKey)
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    [events, selectedKey],
  )

  const monthEventCount = useMemo(
    () => days.filter((day) => day.inMonth).reduce((total, day) => total + day.eventCount, 0),
    [days],
  )

  function selectDay(day: CalendarDay) {
    setSelectedKey(day.key)
    if (!day.inMonth) setVisible(monthStart(day.date))
  }

  function goToMonth(offset: number) {
    const next = new Date(visible.getFullYear(), visible.getMonth() + offset, 1)
    setVisible(next)
    const selected = fromKey(selectedKey)
    if (selected.getMonth() !== next.getMonth() || selected.getFullYear() !== next.getFullYear()) {
      setSelectedKey(dateKey(next))
    }
  }

  function goToToday() {
    const today = new Date()
    setVisible(monthStart(today))
    setSelectedKey(dateKey(today))
  }

  async function handleConfirmDelete() {
    if (!deleting) return
    await deleteEvent(deleting.id)
    bump()
    setDeleting(null)
  }

  return {
    events,
    loading,
    error,
    days,
    visible,
    selectedKey,
    selectedDate: fromKey(selectedKey),
    selectedEvents,
    monthEventCount,
    creating,
    editing,
    deleting,
    selectDay,
    goToMonth,
    goToToday,
    openCreate: () => setCreating(true),
    setEditing,
    setDeleting,
    closeDialogs: () => {
      setCreating(false)
      setEditing(null)
    },
    handleConfirmDelete,
  }
}
