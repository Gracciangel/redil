import { useCallback, useEffect, useRef, useState } from 'react'
import { useCongregationStore } from '@/store/CongregationStore'
import { useStatsStore, type CongregationCounts, type CongregationStats } from '@/store/StatsStore'
import { refreshCongregationStats } from '../services/congregationStats'

const EMPTY: CongregationCounts = { members: 0, ministries: 0, groups: 0, announcements: 0 }
const STATS_TTL_MS = 5 * 60 * 1000

function isFresh(stats?: CongregationStats): boolean {
  if (!stats?.cachedAt) return false
  const at = Date.parse(stats.cachedAt)
  return Number.isFinite(at) && Date.now() - at < STATS_TTL_MS
}

/**
 * Conteos del Home. La cache se muestra siempre, pero se vuelve a consultar si
 * venció (5 min) o si el usuario toca "Actualizar".
 */
export function useCongregationStats(enabled = true) {
  const congregationId = useCongregationStore((s) => s.congregation?.id ?? null)
  const cached = useStatsStore((s) => (congregationId ? s.byCongregation[congregationId] : undefined))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const lastAttempt = useRef<{ id: string; at: number } | null>(null)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(async () => {
    if (!enabled || !congregationId) return
    setLoading(true)
    setError(null)
    try {
      await refreshCongregationStats()
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error(String(cause)))
    } finally {
      setLoading(false)
    }
  }, [enabled, congregationId])

  // Si queda montado, dispara el efecto justo cuando la cache se vuelve vieja.
  useEffect(() => {
    const at = cached ? Date.parse(cached.cachedAt) : NaN
    if (!Number.isFinite(at)) return
    const remaining = STATS_TTL_MS - (Date.now() - at)
    if (remaining <= 0) return
    const timer = setTimeout(() => setTick((value) => value + 1), remaining)
    return () => clearTimeout(timer)
  }, [cached?.cachedAt])

  useEffect(() => {
    if (!enabled || !congregationId) return
    if (cached && isFresh(cached)) return
    // Una sola carga por TTL; los re-renders no vuelven a consultar.
    const now = Date.now()
    const last = lastAttempt.current
    if (last?.id === congregationId && now - last.at < STATS_TTL_MS) return
    lastAttempt.current = { id: congregationId, at: now }
    void refresh()
  }, [enabled, congregationId, cached, refresh, tick])

  const stats: CongregationStats | undefined = cached

  return {
    counts: stats ? { ...EMPTY, ...stats } : { ...EMPTY, cachedAt: '' },
    hasCache: Boolean(stats),
    loading,
    error,
    refresh,
  }
}
