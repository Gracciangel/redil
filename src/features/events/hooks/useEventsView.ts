import { useMemo, useState } from 'react'
import { useAsyncData } from '@/lib/hooks'
import { listEvents } from '@/lib/repo'
import type { CongregationEvent } from '@/lib/types'

export function useEventsView() {
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

  return { events: events ?? [], upcoming, past, loading, error, creating, setCreating, editing, setEditing, deleting, setDeleting }
}