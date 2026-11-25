import { findBook, getBook, referenceOf } from '../lib/bookUtils'
import type { BibleBookData, BibleIndex, BibleReference, BibleVerse } from '../lib/types'

const SAFE_KEY = /^[a-z0-9_]+$/
let indexPromise: Promise<BibleIndex> | null = null
const bookPromises = new Map<string, Promise<BibleBookData>>()

function url(name: string): string {
  return `${import.meta.env.BASE_URL}biblia/${name}.json`
}

async function getJson<T>(name: string): Promise<T> {
  const response = await fetch(url(name))
  if (!response.ok) throw new Error(`No se pudo cargar ${name} (${response.status}).`)
  return response.json() as Promise<T>
}

/** Índice liviano: cantidades por capítulo, sin bajar los textos. */
export function loadBibleIndex(): Promise<BibleIndex> {
  indexPromise ??= getJson<BibleIndex>('index').catch((error: unknown) => {
    indexPromise = null
    throw error
  })
  return indexPromise
}

/** Descarga un solo libro y lo mantiene en memoria durante la sesión. */
export function loadBook(key: string): Promise<BibleBookData> {
  if (!SAFE_KEY.test(key)) throw new Error(`Libro inválido: ${key}`)
  let pending = bookPromises.get(key)
  if (!pending) {
    pending = getJson<BibleBookData>(key).catch((error: unknown) => {
      bookPromises.delete(key)
      throw error
    })
    bookPromises.set(key, pending)
  }
  return pending
}

export function normalizeVerse(text: string): string {
  return text.replace(/\/n/g, '\n')
}

export async function getVerse(reference: BibleReference): Promise<BibleVerse | null> {
  const book = getBook(reference.bookKey)
  if (!book) return null
  const chapters = await loadBook(reference.bookKey)
  const text = chapters[reference.chapter]?.[reference.verse - 1]
  if (!text) return null
  return {
    ...reference,
    text: normalizeVerse(text),
    reference: referenceOf(book, reference.chapter, reference.verse),
  }
}

/** Acepta «Juan 3:16», con o sin tildes y con cualquier cantidad de espacios. */
export function parseReference(input: string): BibleReference | null {
  const match = input.trim().match(/^(.+?)\s+(\d+)\s*:\s*(\d+)$/)
  if (!match) return null
  const book = findBook(match[1])
  const chapter = Number(match[2]) - 1
  const verse = Number(match[3])
  if (!book || chapter < 0 || verse < 1) return null
  return { bookKey: book.key, chapter, verse }
}
