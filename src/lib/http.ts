/** Helpers compartidos de timeout/abort para fetch y promesas. */

export const DEFAULT_TIMEOUT_MS = 15_000

type FetchInput = Parameters<typeof fetch>[0]
type FetchInit = NonNullable<Parameters<typeof fetch>[1]>

function timeoutError(): DOMException {
  return new DOMException('La solicitud tardó demasiado', 'TimeoutError')
}

function canceledError(): DOMException {
  return new DOMException('Solicitud cancelada', 'AbortError')
}

/** `fetch` con timeout y propagación del AbortSignal del llamador. */
export function fetchWithTimeout(
  input: FetchInput,
  init: FetchInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const external = init?.signal
  if (external?.aborted) return Promise.reject(canceledError())

  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)
  const onAbort = () => controller.abort()
  external?.addEventListener('abort', onAbort, { once: true })

  return fetch(input, { ...init, signal: controller.signal })
    .catch((cause: unknown) => {
      if (timedOut) throw timeoutError()
      throw cause
    })
    .finally(() => {
      clearTimeout(timer)
      external?.removeEventListener('abort', onAbort)
    })
}

/** Corre una promesa (por ejemplo un RPC) con timeout/abort opcional. */
export function withAbort<T>(
  promise: PromiseLike<T>,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<T> {
  const { signal, timeoutMs = DEFAULT_TIMEOUT_MS } = options
  if (signal?.aborted) return Promise.reject(canceledError())

  return new Promise<T>((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    }
    const onAbort = () => {
      cleanup()
      reject(canceledError())
    }
    const timer = setTimeout(() => {
      cleanup()
      reject(timeoutError())
    }, timeoutMs)

    signal?.addEventListener('abort', onAbort, { once: true })
    promise.then(
      (value) => {
        cleanup()
        resolve(value)
      },
      (error: unknown) => {
        cleanup()
        reject(error)
      },
    )
  })
}
