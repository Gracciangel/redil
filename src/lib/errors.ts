/** Traduce errores de Supabase/PostgREST a mensajes en español rioplatense. */

interface ErrorInfo {
  code?: string | number
  status?: string | number
  message?: string
  name?: string
}

function infoOf(error: unknown): ErrorInfo {
  return error && typeof error === 'object' ? (error as ErrorInfo) : {}
}

export function toAppError(error: unknown, rpcName?: string): Error {
  const info = infoOf(error)
  const status = Number(info.status)
  const code = String(info.code ?? '')
  const message = info.message ?? ''
  const missingRpc =
    code === 'PGRST202' ||
    code === 'PGRST404' ||
    /\bfunction\b.*\b(does not exist|not found)\b/i.test(message)

  let text: string
  if (info.name === 'AbortError') text = 'La consulta se canceló. Intentá de nuevo.'
  else if (info.name === 'TimeoutError') text = 'La consulta tardó demasiado. Revisá tu conexión.'
  else if (status === 401 || code === '401' || code === 'PGRST301')
    text = 'Tu sesión venció, volvé a iniciar'
  else if (missingRpc)
    text = rpcName
      ? `Falta el RPC ${rpcName} en Supabase. Revisá que esté creado y recargá el schema.`
      : 'Falta un RPC en Supabase. Revisá la configuración del backend y recargá el schema.'
  else if (status === 404 || code === '404' || code === 'PGRST116')
    text = 'No encontramos lo que buscabas. Puede que ya no exista.'
  else if (status === 403 || code === '403' || code === 'PGRST302')
    text = 'No tenés permisos para hacer esto.'
  else if (status >= 500 || /^5\d\d$/.test(code))
    text = 'El servidor tuvo un problema. Intentá de nuevo en unos minutos.'
  else text = 'No se pudo completar la operación. Intentá de nuevo.'

  const wrapped = new Error(text, { cause: error })
  wrapped.name = 'AppError'
  return wrapped
}
