import { useMemo, useState } from 'react'
import { useAsyncData } from '@/lib/hooks'
import { listMembers } from '@/lib/repo'
import { ROLE_LABELS, type Member } from '@/lib/types'

const fold = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

export function useMembersView(enabled = true) {
  const { data: members, loading, error } = useAsyncData(listMembers, [], enabled)
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

  return {
    members: members ?? [],
    filtered,
    loading,
    error,
    query,
    setQuery,
    creating,
    setCreating,
    editing,
    setEditing,
    deleting,
    setDeleting,
  }
}