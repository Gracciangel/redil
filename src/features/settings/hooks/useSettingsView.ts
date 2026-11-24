import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { pingApi } from '@/lib/api'
import { createBackup, downloadBackup, readBackupFile, restoreBackup } from '@/lib/backup'
import { pluralize } from '@/lib/format'
import { useAsyncData, useSyncStatus } from '@/lib/hooks'
import { clearAllData, listAnnouncements, listEvents, listMembers } from '@/lib/repo'
import { loadDemoData } from '@/lib/seed'
import { useSettings } from '@/lib/settings'
import { refreshPending, runSync } from '@/lib/sync'
import { usePWA } from '@/pwa/PWAProvider'
import { useUserStore } from '@/store/Store'

export type Notice = { tone: 'ok' | 'error'; text: string }
export type ConfirmKind = 'clear' | 'demo'

export function useSettingsView() {
  const { settings, save } = useSettings()
  const sync = useSyncStatus()
  const pwa = usePWA()
  const user = useUserStore((s) => s.user)

  const { data: counts } = useAsyncData(async () => {
    const [members, events, announcements] = await Promise.all([listMembers(), listEvents(), listAnnouncements()])
    return { members: members.length, events: events.length, announcements: announcements.length }
  })

  const [name, setName] = useState(settings.congregationName)
  const [apiUrl, setApiUrl] = useState(settings.apiUrl)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<ConfirmKind | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setName(settings.congregationName)
    setApiUrl(settings.apiUrl)
  }, [settings.congregationName, settings.apiUrl])

  const apiConfigured = settings.apiUrl.trim().length > 0
  const totalRecords = (counts?.members ?? 0) + (counts?.events ?? 0) + (counts?.announcements ?? 0)

  function notify(tone: Notice['tone'], text: string) {
    setNotice({ tone, text })
  }

  async function handleSaveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy('name')
    try {
      await save({ congregationName: user?.displayName ?? name })
      notify('ok', 'Nombre de la congregación actualizado.')
    } catch {
      notify('error', 'No se pudo guardar el nombre.')
    } finally {
      setBusy(null)
    }
  }

  async function handleSaveApi(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = apiUrl.trim()
    if (value && !/^(https?:\/\/|\/)/i.test(value)) {
      notify('error', 'La URL debe empezar por https:// o por / (misma web).')
      return
    }
    setBusy('api')
    try {
      await save({ apiUrl: value })
      notify('ok', value ? 'API guardada. La sincronización empezará automáticamente.' : 'Sincronización desactivada. Redil seguirá funcionando solo en este dispositivo.')
    } catch {
      notify('error', 'No se pudo guardar la URL de la API.')
    } finally {
      setBusy(null)
    }
  }

  async function handleTestConnection() {
    const value = apiUrl.trim()
    if (!value) return notify('error', 'Escribe primero la URL de la API.')
    setBusy('test')
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 6000)
    try {
      await pingApi(value, controller.signal)
      notify('ok', 'Conexión correcta: la API responde.')
    } catch (error) {
      const text = error instanceof Error ? (error.name === 'AbortError' ? 'La API no respondió a tiempo.' : error.message) : 'No se pudo conectar con la API.'
      notify('error', text)
    } finally {
      window.clearTimeout(timeout)
      setBusy(null)
    }
  }

  async function handleSyncNow() {
    const value = apiUrl.trim()
    if (!value) return notify('error', 'Configura primero la URL de la API.')
    setBusy('sync')
    try {
      const result = await runSync({ ...settings, apiUrl: value })
      if (result.state === 'error') notify('error', result.error ?? 'Error de sincronización.')
      else if (result.pending === 0) notify('ok', 'Sincronización completada. Todo está al día.')
      else notify('ok', `Quedan ${result.pending} cambios pendientes; se reintentará en breve.`)
    } finally {
      setBusy(null)
    }
  }

  async function handleExport() {
    setBusy('export')
    try {
      const backup = await createBackup()
      downloadBackup(backup)
      notify('ok', 'Copia de seguridad descargada como archivo JSON.')
    } catch {
      notify('error', 'No se pudo crear la copia de seguridad.')
    } finally {
      setBusy(null)
    }
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy('import')
    try {
      const parsed = await readBackupFile(file)
      const total = await restoreBackup(parsed)
      await refreshPending()
      notify('ok', `Copia restaurada: ${pluralize(total, 'registro', 'registros')}.`)
    } catch (error) {
      notify('error', error instanceof Error ? error.message : 'No se pudo importar la copia.')
    } finally {
      setBusy(null)
    }
  }

  async function handleDemo() {
    setBusy('demo')
    try {
      await loadDemoData()
      notify('ok', 'Datos de ejemplo añadidos. Puedes borrarlos cuando quieras.')
    } catch {
      notify('error', 'No se pudieron cargar los datos de ejemplo.')
    } finally {
      setBusy(null)
      setConfirm(null)
    }
  }

  async function handleClear() {
    setBusy('clear')
    try {
      await clearAllData()
      await refreshPending()
      notify('ok', 'Se han borrado todos los datos locales.')
    } catch {
      notify('error', 'No se pudieron borrar los datos.')
    } finally {
      setBusy(null)
      setConfirm(null)
    }
  }

  async function handleInstall() {
    const outcome = await pwa.install()
    if (outcome === 'accepted') notify('ok', 'Redil se está instalando. Búscala en tu pantalla de inicio.')
  }

  async function handleUpdate() {
    if (pwa.needRefresh) {
      setBusy('update')
      try {
        await pwa.updateServiceWorker()
      } finally {
        setBusy(null)
      }
      return
    }
    pwa.checkForUpdate()
    notify('ok', 'Buscando actualizaciones. Si hay una nueva, aparecerá un aviso.')
  }

  return {
    settings, sync, pwa, counts, name, setName, apiUrl, setApiUrl, notice, busy, confirm, setConfirm, fileInputRef,
    apiConfigured, totalRecords, handleSaveName, handleSaveApi, handleTestConnection, handleSyncNow, handleExport, handleImport, handleDemo, handleClear, handleInstall, handleUpdate,
  }
}