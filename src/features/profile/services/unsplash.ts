import { fetchWithTimeout } from '@/lib/http'

export type UnsplashVariant = 'photo' | 'banner'

export interface UnsplashPhoto {
  id: string
  thumbUrl: string
  regularUrl: string
  photographer: string
  pageUrl: string
}

interface ApiPhoto {
  id: string
  urls: { small: string; regular: string }
  user?: { name?: string; username?: string }
  links?: { html?: string }
}

const KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY?.trim()
const ORIENTATION: Record<UnsplashVariant, string> = { photo: 'squarish', banner: 'landscape' }
const CACHE = new Map<string, UnsplashPhoto[]>()

export function hasUnsplashKey(): boolean {
  return Boolean(KEY)
}

/** Busca imágenes en Unsplash y cachea cada término por variante. */
export async function searchUnsplash(
  query: string,
  variant: UnsplashVariant = 'banner',
  signal?: AbortSignal,
): Promise<UnsplashPhoto[]> {
  const term = query.trim() || 'paisaje'
  if (!KEY) throw new Error('Falta VITE_UNSPLASH_ACCESS_KEY en .env.')
  const cacheKey = `${variant}:${term}`
  const cached = CACHE.get(cacheKey)
  if (cached) return cached

  const params = new URLSearchParams({
    query: term,
    per_page: '12',
    orientation: ORIENTATION[variant],
    content_filter: 'high',
    client_id: KEY,
  })
  const response = await fetchWithTimeout(`https://api.unsplash.com/search/photos?${params}`, {
    headers: { 'Accept-Version': 'v1' },
    signal,
  })
  if (!response.ok) {
    throw new Error(`Unsplash respondió ${response.status}. Revisá la Access Key o el límite de consultas.`)
  }

  const payload = (await response.json()) as { results?: ApiPhoto[] }
  const photos = (payload.results ?? []).map(toPhoto)
  CACHE.set(cacheKey, photos)
  return photos
}

function toPhoto(item: ApiPhoto): UnsplashPhoto {
  return {
    id: item.id,
    thumbUrl: item.urls.small,
    regularUrl: item.urls.regular,
    photographer: item.user?.name || item.user?.username || 'Unsplash',
    pageUrl: item.links?.html || `https://unsplash.com/photos/${item.id}`,
  }
}
