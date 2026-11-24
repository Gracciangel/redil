import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Field, PageHeader } from '@/components/Feedback'
import { Icon } from '@/components/Icons'
import { InstallCard } from '@/components/InstallCard'
import { pingApi } from '@/lib/api'
import {
  createBackup,
  downloadBackup,
  readBackupFile,
  restoreBackup,
} from '@/lib/backup'
import { formatRelative, pluralize } from '@/lib/format'
import { useAsyncData, useSyncStatus } from '@/lib/hooks'
import { clearAllData, listAnnouncements, listEvents, listMembers } from '@/lib/repo'
import { loadDemoData } from '@/lib/seed'
import { useSettings } from '@/lib/settings'
import { refreshPending, runSync, type SyncStatus } from '@/lib/sync'
import { usePWA } from '@/pwa/PWAProvider'
import { useUserStore } from '@/store/Store'

type Notice = { tone: 'ok' | 'error'; text: string }
type ConfirmKind = 'clear' | 'demo'

function syncStateLabel(sync: SyncStatus, apiConfigured: boolean): string {
  if (!apiConfigured) return 'Solo local: los datos no salen del dispositivo'
  switch (sync.state) {
    case 'syncing':
      return 'Sincronizando…'
    case 'error':
      return 'Error de sincronización'
    case 'unconfigured':
      return 'API sin configurar'
    default:
      return 'Al día'
  }
}

export function SettingsPage() {
  const { settings, save } = useSettings()
  const sync = useSyncStatus()
  const {
    canInstall,
    install,
    installed,
    needRefresh,
    offlineReady,
    updateServiceWorker,
    checkForUpdate,
  } = usePWA()

  const { data: counts } = useAsyncData(async () => {
    const [members, events, announcements] = await Promise.all([
      listMembers(),
      listEvents(),
      listAnnouncements(),
    ])
    return {
      members: members.length,
      events: events.length,
      announcements: announcements.length,
    }
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
  const totalRecords =
    (counts?.members ?? 0) + (counts?.events ?? 0) + (counts?.announcements ?? 0)

  function notify(tone: Notice['tone'], text: string) {
    setNotice({ tone, text })
  }

  async function handleSaveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const user = useUserStore((s) => s.user) ;
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
      notify(
        'ok',
        value
          ? 'API guardada. La sincronización empezará automáticamente.'
          : 'Sincronización desactivada. Redil seguirá funcionando solo en este dispositivo.',
      )
    } catch {
      notify('error', 'No se pudo guardar la URL de la API.')
    } finally {
      setBusy(null)
    }
  }

  async function handleTestConnection() {
    const value = apiUrl.trim()
    if (!value) {
      notify('error', 'Escribe primero la URL de la API.')
      return
    }
    setBusy('test')
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 6000)
    try {
      await pingApi(value, controller.signal)
      notify('ok', 'Conexión correcta: la API responde.')
    } catch (error) {
      const text =
        error instanceof Error
          ? error.name === 'AbortError'
            ? 'La API no respondió a tiempo.'
            : error.message
          : 'No se pudo conectar con la API.'
      notify('error', text)
    } finally {
      window.clearTimeout(timeout)
      setBusy(null)
    }
  }

  async function handleSyncNow() {
    const value = apiUrl.trim()
    if (!value) {
      notify('error', 'Configura primero la URL de la API.')
      return
    }
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
    const outcome = await install()
    if (outcome === 'accepted') {
      notify('ok', 'Redil se está instalando. Búscala en tu pantalla de inicio.')
    }
  }

  async function handleUpdate() {
    if (needRefresh) {
      setBusy('update')
      try {
        await updateServiceWorker()
      } finally {
        setBusy(null)
      }
      return
    }
    checkForUpdate()
    notify('ok', 'Buscando actualizaciones. Si hay una nueva, aparecerá un aviso.')
  }

  return (
    <div className="page">
      <PageHeader
        title="Ajustes"
        subtitle="Congregación, sincronización y datos de la app"
      />

      {notice && (
        <p
          className={`settings-message settings-message-${notice.tone}`}
          role="status"
        >
          <Icon name={notice.tone === 'ok' ? 'check' : 'alert'} size={16} />
          {notice.text}
        </p>
      )}

      <section className="settings-card" aria-labelledby="settings-congregation">
        <header className="settings-card-header">
          <h2 id="settings-congregation">Congregación</h2>
          <p>Este nombre aparece en la cabecera y en la app instalada.</p>
        </header>
        <form className="settings-form" onSubmit={handleSaveName}>
          <Field label="Nombre" htmlFor="settings-name">
            <input
              id="settings-name"
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Iglesia Evangélica…"
            />
          </Field>
          <div className="settings-actions">
            <button
              type="submit"
              className="btn btn-secondary"
              disabled={busy === 'name' || name.trim() === settings.congregationName}
            >
              {busy === 'name' ? 'Guardando…' : 'Guardar nombre'}
            </button>
          </div>
        </form>
      </section>

      <section className="settings-card" aria-labelledby="settings-sync">
        <header className="settings-card-header">
          <h2 id="settings-sync">Sincronización</h2>
          <p>
            Redil guarda todo en el dispositivo. Si conectas tu API, los cambios se
            enviarán en cuanto haya conexión.
          </p>
        </header>

        <form className="settings-form" onSubmit={handleSaveApi} noValidate>
          <Field
            label="URL de la API"
            htmlFor="settings-api"
            hint="Ejemplo: https://api.micongregacion.org/redil o /api si está en la misma web."
          >
            <input
              id="settings-api"
              className="input"
              type="text"
              inputMode="url"
              value={apiUrl}
              onChange={(event) => setApiUrl(event.target.value)}
              placeholder="https://api.ejemplo.org/redil"
              spellCheck={false}
              autoComplete="off"
            />
          </Field>
          <div className="settings-actions">
            <button
              type="submit"
              className="btn btn-secondary"
              disabled={busy === 'api' || apiUrl.trim() === settings.apiUrl}
            >
              {busy === 'api' ? 'Guardando…' : 'Guardar URL'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => void handleTestConnection()}
              disabled={busy !== null || !apiUrl.trim()}
            >
              <Icon name="external" size={16} />
              {busy === 'test' ? 'Probando…' : 'Probar conexión'}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void handleSyncNow()}
              disabled={busy !== null || !apiConfigured}
            >
              <Icon name="refresh" size={16} />
              {busy === 'sync' ? 'Sincronizando…' : 'Sincronizar ahora'}
            </button>
          </div>
        </form>

        <dl className="sync-details">
          <div>
            <dt>Estado</dt>
            <dd>{syncStateLabel(sync, apiConfigured)}</dd>
          </div>
          <div>
            <dt>Cambios pendientes</dt>
            <dd>{pluralize(sync.pending, 'cambio', 'cambios')}</dd>
          </div>
          <div>
            <dt>Última sincronización</dt>
            <dd>{sync.lastSyncAt ? formatRelative(sync.lastSyncAt) : 'Nunca'}</dd>
          </div>
          {sync.error && (
            <div>
              <dt>Último error</dt>
              <dd className="sync-error-text">{sync.error}</dd>
            </div>
          )}
        </dl>

        <details className="api-docs">
          <summary>Contrato de la API que espera Redil</summary>
          <pre>{`PUT    {apiUrl}/members/{id}
PUT    {apiUrl}/events/{id}
PUT    {apiUrl}/announcements/{id}
DELETE {apiUrl}/{entity}/{id}
GET    {apiUrl}/health`}</pre>
          <p>
            El cuerpo del PUT es el registro completo en JSON. La cabecera{' '}
            <code>X-Redil-Op</code> identifica cada operación para deduplicar
            reintentos. El servidor debe permitir CORS desde el origen de la app.
          </p>
        </details>
      </section>

      <section className="settings-card" aria-labelledby="settings-app">
        <header className="settings-card-header">
          <h2 id="settings-app">Aplicación</h2>
          <p>Instalación, actualizaciones y estado de la PWA.</p>
        </header>

        <InstallCard />

        <div className="settings-row">
          <div className="settings-row-copy">
            <strong>Versión {__APP_VERSION__}</strong>
            <span>
              {needRefresh
                ? 'Hay una actualización lista para activarse.'
                : offlineReady
                  ? 'Lista para funcionar sin conexión.'
                  : 'El contenido se guarda para usarse sin conexión.'}
            </span>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void handleUpdate()}
            disabled={busy === 'update'}
          >
            <Icon name={needRefresh ? 'refresh' : 'download'} size={16} />
            {needRefresh ? 'Actualizar ahora' : 'Buscar actualizaciones'}
          </button>
        </div>

        <div className="settings-row">
          <div className="settings-row-copy">
            <strong>{installed || canInstall ? 'Instalación' : 'Instalar app'}</strong>
            <span>
              {installed
                ? 'Redil está abierta como aplicación instalada.'
                : canInstall
                  ? 'Añádela a tu pantalla de inicio.'
                  : 'Usa el menú del navegador → «Instalar aplicación».'}
            </span>
          </div>
          {installed ? (
            <span className="badge badge-ok">
              <Icon name="check" size={12} />
              Instalada
            </span>
          ) : canInstall ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void handleInstall()}
            >
              <Icon name="install" size={16} />
              Instalar
            </button>
          ) : null}
        </div>
      </section>

      <section className="settings-card" aria-labelledby="settings-data">
        <header className="settings-card-header">
          <h2 id="settings-data">Datos</h2>
          <p>
            {counts
              ? `${pluralize(counts.members, 'miembro', 'miembros')} · ${pluralize(
                  counts.events,
                  'evento',
                  'eventos',
                )} · ${pluralize(counts.announcements, 'aviso', 'avisos')}`
              : 'Cargando…'}
          </p>
        </header>

        <div className="settings-actions settings-actions-wrap">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void handleExport()}
            disabled={busy !== null}
          >
            <Icon name="download" size={16} />
            {busy === 'export' ? 'Creando…' : 'Exportar copia'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy !== null}
          >
            <Icon name="upload" size={16} />
            {busy === 'import' ? 'Importando…' : 'Importar copia'}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setConfirm('demo')}
            disabled={busy !== null}
          >
            <Icon name="sparkles" size={16} />
            Datos de ejemplo
          </button>
          <button
            type="button"
            className="btn btn-danger-ghost"
            onClick={() => setConfirm('clear')}
            disabled={busy !== null}
          >
            <Icon name="trash" size={16} />
            Borrar todo
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(event) => void handleImport(event)}
        />

        <p className="settings-note">
          Las copias incluyen miembros, eventos y avisos. Guárdalas en un lugar seguro:
          son la única forma de recuperar los datos si borras la app.
        </p>
      </section>

      <p className="settings-footer">
        Redil funciona sin conexión y no envía datos a ningún servidor salvo la API que
        configures. Versión {__APP_VERSION__}.
      </p>

      <ConfirmDialog
        open={confirm === 'demo'}
        title="Cargar datos de ejemplo"
        message={
          totalRecords > 0
            ? 'Se añadirán 8 miembros, 4 eventos y 3 avisos de ejemplo a los datos que ya tienes.'
            : 'Se añadirán 8 miembros, 4 eventos y 3 avisos de ejemplo para que veas cómo funciona la app.'
        }
        confirmLabel="Cargar ejemplos"
        busyLabel="Cargando…"
        onCancel={() => setConfirm(null)}
        onConfirm={handleDemo}
      />

      <ConfirmDialog
        open={confirm === 'clear'}
        title="Borrar todos los datos"
        message="Se eliminarán todos los miembros, eventos y avisos de este dispositivo, incluidos los cambios pendientes de sincronizar. Esta acción no se puede deshacer."
        confirmLabel="Borrar todo"
        busyLabel="Borrando…"
        onCancel={() => setConfirm(null)}
        onConfirm={handleClear}
      />
    </div>
  )
}
