import { useState, type FormEvent } from 'react'
import { useMyMinistries } from '@/features/congregations/hooks/useMyMinistries'
import { useTenantMinistries } from '@/features/congregations/hooks/useTenantData'
import { getMyMembership } from '@/features/congregations/services/membership'
import {
  createTenantMinistry,
  type CongregationMinistry,
} from '@/features/congregations/services/tenantAdmin'
import { refreshCongregationStats } from '@/features/congregations/services/congregationStats'
import { useAsyncData } from '@/lib/hooks'
import { useCongregationStore } from '@/store/CongregationStore'
import { useUserStore } from '@/store/Store'

function loadMyMembership() {
  return getMyMembership()
}

export type CreateNotice = { tone: 'ok' | 'error'; text: string }

export interface ProfileVM {
  isTenant: boolean
  /** vify de la congregación: habilita el tilde azul en el Perfil. */
  verified: boolean
  name: string
  email: string | null
  photoURL: string | null
  congregationName: string | null
  bio: string | null
  /** Ministerios y grupos a los que pertenece el usuario (R3). */
  ministries: string[]
  groups: string[]
  /** Cantidad de ministerios/grupos que lidera: habilita capacidades (L). */
  ledCount: number
  isLeader: boolean
  /** El tenant crea ministerios/grupos desde su propio Perfil. */
  tenantMinistries: CongregationMinistry[]
  tenantMinistriesLoading: boolean
  tenantMinistriesError: Error | null
  newMinistryName: string
  setNewMinistryName: (value: string) => void
  newMinistryIsGroup: boolean
  setNewMinistryIsGroup: (value: boolean) => void
  createNotice: CreateNotice | null
  createBusy: boolean
  handleCreateMinistry: (event: FormEvent<HTMLFormElement>) => Promise<void>
}

/**
 * Viewmodel del Perfil. Según las reglas de vistas, un tenant ve además los
 * miembros de su congregación; acá solo expongo `isTenant` para que la view
 * decida qué bloque presentar, sin leer Supabase directamente.
 */
export function useProfileView(): ProfileVM {
  const user = useUserStore((s) => s.user)
  const congregation = useCongregationStore((s) => s.congregation)
  const isTenant = Boolean(congregation)

  // Ambos hooks se llaman siempre (reglas de hooks); cada uno se desactiva
  // según el perfil. El tenant no tiene auth.uid(), el miembro no tiene token.
  const member = useMyMinistries(!isTenant)
  const tenant = useTenantMinistries(isTenant)
  const membership = useAsyncData(loadMyMembership, [], !isTenant)

  const [newMinistryName, setNewMinistryName] = useState('')
  const [newMinistryIsGroup, setNewMinistryIsGroup] = useState(false)
  const [createNotice, setCreateNotice] = useState<CreateNotice | null>(null)
  const [createBusy, setCreateBusy] = useState(false)

  const mine = member.ministries
  const ledCount = mine.filter((item) => item.isLeader).length

  async function handleCreateMinistry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!newMinistryName.trim()) return
    setCreateBusy(true)
    setCreateNotice(null)
    try {
      await createTenantMinistry(newMinistryName.trim(), newMinistryIsGroup)
      setNewMinistryName('')
      tenant.reload()
      // La cache del Home se actualiza también: el conteo cambió.
      void refreshCongregationStats().catch(() => undefined)
      setCreateNotice({
        tone: 'ok',
        text: newMinistryIsGroup ? 'Grupo creado.' : 'Ministerio creado.',
      })
    } catch (error) {
      setCreateNotice({
        tone: 'error',
        text: error instanceof Error ? error.message : 'No se pudo crear el ministerio o grupo.',
      })
    } finally {
      setCreateBusy(false)
    }
  }

  const shared = {
    tenantMinistries: tenant.ministries,
    tenantMinistriesLoading: tenant.loading,
    tenantMinistriesError: tenant.error,
    newMinistryName,
    setNewMinistryName,
    newMinistryIsGroup,
    setNewMinistryIsGroup,
    createNotice,
    createBusy,
    handleCreateMinistry,
  }

  if (congregation) {
    return {
      ...shared,
      isTenant: true,
      verified: Boolean(congregation.vify),
      name: congregation.name,
      email: congregation.admin_email,
      photoURL: congregation.photoUrl,
      congregationName: congregation.name,
      bio: congregation.bio,
      ministries: [],
      groups: [],
      ledCount: 0,
      isLeader: false,
    }
  }

  return {
    ...shared,
    isTenant: false,
    verified: false,
    name: user?.displayName ?? 'Miembro',
    email: user?.email ?? null,
    photoURL: user?.photoURL ?? null,
    congregationName: membership.data?.name ?? null,
    bio: null,
    ministries: mine.filter((item) => !item.isGroup).map((item) => item.name),
    groups: mine.filter((item) => item.isGroup).map((item) => item.name),
    ledCount,
    isLeader: ledCount > 0,
  }
}
