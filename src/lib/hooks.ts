import { useCallback, useEffect, useState, useSyncExternalStore, type DependencyList } from 'react'
import { getVersion, subscribe } from './live'
import { getSyncStatus, subscribeSync, type SyncStatus } from './sync'

/**
 * Se re-renderiza cuando cambia el canal indicado. Sin canal mantiene el
 * comportamiento histórico: cualquier `bump()` global lo refresca.
 */
export function useDataVersion(channel?: string): number {
  const subscribeChannel = useCallback(
    (listener: () => void) => subscribe(listener, channel),
    [channel],
  )
  const getChannelVersion = useCallback(() => getVersion(channel), [channel])
  return useSyncExternalStore(subscribeChannel, getChannelVersion, getChannelVersion)
}

export interface AsyncState<T> {
  data: T | undefined
  loading: boolean
  error: Error | null
}

export interface AsyncOptions {
  /** Canal de `bump` al que responde esta carga; `undefined` = global. */
  channel?: string
}

/**
 * Carga datos asíncronos y los recarga cuando cambia su canal.
 * `loader` debe ser estable (función de módulo) y `deps` adicionales si aplica.
 * Con `enabled = false` no ejecuta el loader (útil para guards según perfil).
 * El cuarto argumento es opcional: los llamadores actuales no se modifican.
 */
export function useAsyncData<T>(
  loader: () => Promise<T>,
  deps: DependencyList = [],
  enabled = true,
  options: AsyncOptions = {},
): AsyncState<T> {
  const version = useDataVersion(options.channel)
  const [state, setState] = useState<AsyncState<T>>({
    data: undefined,
    loading: true,
    error: null,
  })

  useEffect(() => {
    if (!enabled) {
      setState({ data: undefined, loading: false, error: null })
      return
    }

    let active = true
    setState((previous) => ({ data: previous.data, loading: true, error: null }))

    loader()
      .then((data) => {
        if (active) setState({ data, loading: false, error: null })
      })
      .catch((error: unknown) => {
        if (!active) return
        setState({
          data: undefined,
          loading: false,
          error: error instanceof Error ? error : new Error(String(error)),
        })
      })

    return () => {
      active = false
    }
    // `loader` se asume estable; la recarga la provoca la versión del canal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, version, ...deps])

  return state
}

function subscribeOnline(callback: () => void): () => void {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

const getOnline = (): boolean => navigator.onLine

export function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, getOnline, () => true)
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(subscribeSync, getSyncStatus, getSyncStatus)
}
