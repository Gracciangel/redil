import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Conteos del panel de la congregación, guardados en localStorage. */
export interface CongregationStats {
  members: number
  ministries: number
  groups: number
  announcements: number
  /** ISO date del último refresco contra Supabase. */
  cachedAt: string
}

export type CongregationCounts = Pick<CongregationStats, 'members' | 'ministries' | 'groups' | 'announcements'>

interface StatsState {
  byCongregation: Record<string, CongregationStats>
  setStats: (congregationId: string, counts: CongregationCounts) => void
  clearStats: (congregationId?: string) => void
  /** Vacía toda la caché (logout / cambio de sesión). */
  reset: () => void
}

/**
 * No consultamos los conteos cada vez que se abre el Home: se guardan por
 * congregación y se refrescan solo cuando algo cambia (o el usuario lo pide).
 */
export const useStatsStore = create<StatsState>()(
  persist(
    (set) => ({
      byCongregation: {},
      setStats: (congregationId, counts) =>
        set((state) => ({
          byCongregation: {
            ...state.byCongregation,
            [congregationId]: { ...counts, cachedAt: new Date().toISOString() },
          },
        })),
      clearStats: (congregationId) =>
        set((state) => {
          if (!congregationId) return { byCongregation: {} }
          const next = { ...state.byCongregation }
          delete next[congregationId]
          return { byCongregation: next }
        }),
      reset: () => set({ byCongregation: {} }),
    }),
    { name: 'redil-stats' },
  ),
)
