import { useEffect, useState } from 'react'
import { useAsyncData } from '@/lib/hooks'
import { getVerseOfDay } from '../services/verseOfDay'

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

/** Loader estable para `useAsyncData`: siempre devuelve el versículo del día actual. */
function loadVerseOfDay() {
  return getVerseOfDay()
}

function millisecondsToTomorrow(): number {
  const now = new Date()
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return tomorrow.getTime() - now.getTime() + 1_000
}

/** Recalcula automáticamente cuando cambia el día local. */
export function useVerseOfDay() {
  const [today, setToday] = useState(() => dayKey(new Date()))
  useEffect(() => {
    const timer = window.setTimeout(
      () => setToday(dayKey(new Date())),
      millisecondsToTomorrow(),
    )
    return () => window.clearTimeout(timer)
  }, [today])

  return useAsyncData(loadVerseOfDay, [today])
}
