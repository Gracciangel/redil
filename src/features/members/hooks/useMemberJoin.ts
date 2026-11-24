import { useState } from 'react'
import {
  joinCongregationByCode, previewCongregationByCode, syncMyRole,
  type CongregationPreview,
} from '@/features/congregations/services/membership'

function messageFrom(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

/** Canje del `invitation_code` (R7), separado del contenido del Home. */
export function useMemberJoin() {
  const [code, setCode] = useState('')
  const [preview, setPreview] = useState<CongregationPreview | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [joining, setJoining] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [joinedCongregationId, setJoinedCongregationId] = useState<string | null>(null)
  const [membershipVersion, setMembershipVersion] = useState(0)

  async function handlePreview(codeValue?: string) {
    const value = (codeValue ?? code).trim()
    if (!value) {
      setActionError('Ingresá un código de invitación.')
      return
    }
    setPreviewing(true)
    setActionError(null)
    setPreview(null)
    try {
      const result = await previewCongregationByCode(value)
      if (!result) setActionError('No encontramos una congregación con ese código.')
      setPreview(result)
    } catch (error) {
      setActionError(messageFrom(error, 'No se pudo buscar la congregación.'))
    } finally {
      setPreviewing(false)
    }
  }

  async function handleJoin(codeValue?: string) {
    const value = (codeValue ?? code).trim()
    if (!value) {
      setActionError('Ingresá un código de invitación.')
      return
    }
    setCode(value)
    setJoining(true)
    setActionError(null)
    try {
      const congregationId = await joinCongregationByCode(value)
      setJoinedCongregationId(congregationId)
      setMembershipVersion((version) => version + 1)
      void syncMyRole().catch(() => undefined)
    } catch (error) {
      setActionError(messageFrom(error, 'No se pudo completar la unión.'))
    } finally {
      setJoining(false)
    }
  }

  return {
    code, setCode, preview, previewing, joining, actionError,
    joinedCongregationId, membershipVersion, handlePreview, handleJoin,
  }
}
