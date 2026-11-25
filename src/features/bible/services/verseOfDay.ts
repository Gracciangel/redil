import { NT_KEYS } from '../lib/bookUtils'
import type { BibleIndex, BibleReference, BibleVerse } from '../lib/types'
import { getVerse, loadBibleIndex } from './bibleService'

/** Día local como número: el mismo día del mismo huso da siempre el mismo índice. */
export function dayNumber(date: Date): number {
  const utc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.floor(utc / 86_400_000)
}

function newTestamentReferences(index: BibleIndex): BibleReference[] {
  const references: BibleReference[] = []
  for (const key of NT_KEYS) {
    index[key]?.forEach((count, chapter) => {
      for (let verse = 1; verse <= count; verse += 1) {
        references.push({ bookKey: key, chapter, verse })
      }
    })
  }
  return references
}

/**
 * Recorre los 7.958 versículos del NT de a uno por día, así que dos días
 * consecutivos nunca repiten referencia. Solo descarga el libro elegido.
 */
export async function getVerseOfDay(date: Date = new Date()): Promise<BibleVerse> {
  const index = await loadBibleIndex()
  const references = newTestamentReferences(index)
  if (references.length === 0) throw new Error('No hay versículos disponibles.')
  const selected = references[dayNumber(date) % references.length]
  const verse = await getVerse(selected)
  if (!verse) throw new Error('No se pudo cargar el versículo del día.')
  return verse
}
