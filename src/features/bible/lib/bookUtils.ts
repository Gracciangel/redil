import { LIBROS, type BibleBookKey } from './books'
import type { BibleBook } from './types'

export const NT_KEYS: BibleBookKey[] = LIBROS
  .filter((book) => book.testamento === 'NT')
  .map((book) => book.key)

/** Sin tildes ni dobles espacios: «Juan», «juan» y «1 JUAN» apuntan al mismo libro. */
export function normalizeBookName(value: string): string {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

export function getBook(key: string): BibleBook | undefined {
  return LIBROS.find((book) => book.key === key)
}

export function findBook(value: string): BibleBook | undefined {
  const query = normalizeBookName(value)
  if (!query) return undefined
  return LIBROS.find(
    (book) => normalizeBookName(book.nombre) === query || book.key === query,
  )
}

export function referenceOf(book: BibleBook, chapter: number, verse: number): string {
  return `${book.nombre} ${chapter + 1}:${verse}`
}
