import { useState } from 'react'
import { refreshCongregationStats } from '@/features/congregations/services/congregationStats'
import { useAsyncData } from '@/lib/hooks'
import { bump } from '@/lib/live'
import { useCongregationStore } from '@/store/CongregationStore'
import {
  createTenantNews, deleteTenantNews, listMyNews, listTenantNews,
  updateTenantNews, type NewsInput, type NewsItem,
} from '../services/newsService'

type Notice = { tone: 'ok' | 'error'; text: string }

function loadTenant() { return listTenantNews() }
function loadMember() { return listMyNews() }

/** El tenant lista y administra por token; el miembro solo lee. */
export function useAnnouncementsView() {
  const isTenant = Boolean(useCongregationStore((s) => s.congregation))
  const list = useAsyncData(isTenant ? loadTenant : loadMember)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<NewsItem | null>(null)
  const [deleting, setDeleting] = useState<NewsItem | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  function openCreate() {
    setEditing(null); setNotice(null); setFormOpen(true)
  }
  function openEdit(item: NewsItem) {
    setEditing(item); setNotice(null); setFormOpen(true)
  }
  function closeForm() {
    setFormOpen(false); setEditing(null)
  }

  async function save(input: NewsInput) {
    setBusy(true)
    setNotice(null)
    try {
      if (!isTenant) throw new Error('Solo la congregación puede publicar avisos.')
      if (editing) await updateTenantNews(editing.id, input)
      else await createTenantNews(input)
      bump()
      if (isTenant) await refreshCongregationStats().catch(() => undefined)
      closeForm()
      setNotice({ tone: 'ok', text: editing ? 'Aviso actualizado.' : 'Aviso publicado.' })
    } catch (error) {
      const text = error instanceof Error ? error.message : 'No se pudo guardar el aviso.'
      setNotice({ tone: 'error', text })
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!deleting) return
    setBusy(true)
    setNotice(null)
    try {
      if (!isTenant) throw new Error('Solo la congregación puede borrar avisos.')
      await deleteTenantNews(deleting.id)
      bump()
      if (isTenant) await refreshCongregationStats().catch(() => undefined)
      setDeleting(null)
      setNotice({ tone: 'ok', text: 'Aviso eliminado.' })
    } catch (error) {
      const text = error instanceof Error ? error.message : 'No se pudo borrar el aviso.'
      setNotice({ tone: 'error', text })
    } finally {
      setBusy(false)
    }
  }

  return {
    announcements: list.data ?? [],
    loading: list.loading,
    error: list.error,
    canManage: isTenant,
    formOpen, editing, deleting, setDeleting, busy, notice,
    openCreate, openEdit, closeForm, save, remove,
  }
}
