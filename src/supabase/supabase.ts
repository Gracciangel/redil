import { createClient } from '@supabase/supabase-js'
import { toAppError } from '@/lib/errors'
import { fetchWithTimeout, withAbort } from '@/lib/http'

const rawUrl =
  import.meta.env.VITE_SUPABASE_URL ??
  import.meta.env.VITE_AURL_SUPABASE ??
  ''

const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '')

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  import.meta.env.VITE_URL_ANON ??
  ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase: faltan variables de entorno (URL o anon key).')
}

// Timeout global: ninguna request de Supabase (auth o RPC) queda colgada.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: (input, init) => fetchWithTimeout(input, init) },
  auth: {
    // PKCE: el retorno de OAuth trae un `code` en la query, nunca un
    // access_token en el hash. El cliente lo canjea por la sesión.
    flowType: 'pkce',
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
  },
})

/**
 * RPC con timeout, abort opcional y errores traducidos. Firma retrocompatible:
 * los llamadores de dos argumentos siguen funcionando igual.
 */
export async function callRpc<T>(
  name: string,
  params: Record<string, unknown> = {},
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<T> {
  const request = Promise.resolve(supabase.rpc(name, params))
  const { data, error } = await withAbort(request, options)
  if (error) throw toAppError(error, name)
  return data as T
}
