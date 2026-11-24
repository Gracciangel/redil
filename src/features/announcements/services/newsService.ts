import { callRpc } from '@/supabase/supabase'
import { useCongregationStore } from '@/store/CongregationStore'

export interface NewsItem {
  id: string
  title: string
  body: string | null
  imageUrl: string | null
  publishedAt: string
  isGlobal: boolean
}

export interface NewsInput {
  title: string
  body: string | null
  imageUrl: string | null
  isGlobal: boolean
}

type Row = Record<string, unknown>

function rows(data: unknown): Row[] {
  return (Array.isArray(data) ? data : []).map((row) => row as Row)
}

function toNews(row: Row): NewsItem {
  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    body: row.body ? String(row.body) : null,
    imageUrl: row.image_url ? String(row.image_url) : null,
    publishedAt: String(row.published_at ?? ''),
    isGlobal: Boolean(row.is_global),
  }
}

function tenantToken(): string {
  const value = useCongregationStore.getState().congregation?.sessionToken
  if (!value) throw new Error('Iniciá sesión como congregación para continuar.')
  return value
}

/** Firma original intacta; el helper compartido agrega timeout y errores claros. */
async function call<T>(name: string, params: Record<string, unknown> = {}): Promise<T> {
  return callRpc<T>(name, params)
}

/** Tenant: todos sus avisos, inclusive los privados. */
export async function listTenantNews(): Promise<NewsItem[]> {
  const data = await call<unknown>('list_tenant_news', { p_token: tenantToken() })
  return rows(data).map(toNews)
}

export async function createTenantNews(input: NewsInput): Promise<void> {
  await call('create_tenant_news', {
    p_token: tenantToken(),
    p_title: input.title,
    p_body: input.body,
    p_image_url: input.imageUrl,
    p_is_global: input.isGlobal,
  })
}

export async function updateTenantNews(id: string, input: NewsInput): Promise<void> {
  await call('update_tenant_news', {
    p_token: tenantToken(),
    p_news_id: id,
    p_title: input.title,
    p_body: input.body,
    p_image_url: input.imageUrl,
    p_is_global: input.isGlobal,
  })
}

export async function deleteTenantNews(id: string): Promise<void> {
  await call('delete_tenant_news', { p_token: tenantToken(), p_news_id: id })
}

/** Miembro: todos los avisos de su congregación, inclusive los privados. */
export async function listMyNews(): Promise<NewsItem[]> {
  const data = await call<unknown>('list_my_news')
  return rows(data).map(toNews)
}

/** Público: solo avisos con is_global = true de una congregación. */
export async function listPublicNews(congregationId: string): Promise<NewsItem[]> {
  const data = await call<unknown>('list_public_news', { p_congregation_id: congregationId })
  return rows(data).map(toNews)
}
