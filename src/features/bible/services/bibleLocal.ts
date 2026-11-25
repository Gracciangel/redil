import type { BibleFavorite, BiblePreferences, BibleReference, BibleVerse } from '../lib/types'

const FAVORITES_KEY = 'redil-bible-favorites'
const PREFERENCES_KEY = 'redil-bible-preferences'

export const DEFAULT_PREFERENCES: BiblePreferences = {
  textColor: '#ffffff',
  backgroundColor: '#000000',
  fontSize: 18,
  highlightEnabled: false,
  highlightWord: '',
}

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeJson(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* modo privado */ }
}

function sameVerse(a: BibleReference, b: BibleReference): boolean {
  return a.bookKey === b.bookKey && a.chapter === b.chapter && a.verse === b.verse
}

function isFavorite(value: unknown): value is BibleFavorite {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<BibleFavorite>
  return typeof item.bookKey === 'string'
    && typeof item.chapter === 'number'
    && typeof item.verse === 'number'
    && typeof item.text === 'string'
    && typeof item.reference === 'string'
}

export function listFavorites(): BibleFavorite[] {
  const raw = readJson(FAVORITES_KEY)
  return Array.isArray(raw) ? raw.filter(isFavorite) : []
}

export function saveFavorites(items: BibleFavorite[]): void {
  writeJson(FAVORITES_KEY, items)
}

export function hasFavorite(ref: BibleReference, items: BibleFavorite[] = listFavorites()): boolean {
  return items.some((item) => sameVerse(item, ref))
}

export function toggleFavorite(verse: BibleVerse, items: BibleFavorite[] = listFavorites()): BibleFavorite[] {
  const ref = { bookKey: verse.bookKey, chapter: verse.chapter, verse: verse.verse }
  const next = hasFavorite(ref, items)
    ? items.filter((item) => !sameVerse(item, ref))
    : [{ ...verse, createdAt: new Date().toISOString() }, ...items]
  saveFavorites(next)
  return next
}

export function removeFavorite(ref: BibleReference, items: BibleFavorite[] = listFavorites()): BibleFavorite[] {
  const next = items.filter((item) => !sameVerse(item, ref))
  saveFavorites(next)
  return next
}

export function loadPreferences(): BiblePreferences {
  const raw = readJson(PREFERENCES_KEY)
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_PREFERENCES }
  const value = raw as Partial<BiblePreferences>
  return {
    textColor: typeof value.textColor === 'string' ? value.textColor : DEFAULT_PREFERENCES.textColor,
    backgroundColor: typeof value.backgroundColor === 'string' ? value.backgroundColor : DEFAULT_PREFERENCES.backgroundColor,
    fontSize: typeof value.fontSize === 'number' ? Math.min(32, Math.max(12, value.fontSize)) : DEFAULT_PREFERENCES.fontSize,
    highlightEnabled: typeof value.highlightEnabled === 'boolean' ? value.highlightEnabled : DEFAULT_PREFERENCES.highlightEnabled,
    highlightWord: typeof value.highlightWord === 'string' ? value.highlightWord : DEFAULT_PREFERENCES.highlightWord,
  }
}

export function savePreferences(preferences: BiblePreferences): void {
  writeJson(PREFERENCES_KEY, preferences)
}
