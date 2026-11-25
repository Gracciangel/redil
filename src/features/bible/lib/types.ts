export type Testament = 'AT' | 'NT'

export interface BibleBook {
  nombre: string
  key: string
  testamento: Testament
}

/** Capítulos 0-based; cada array tiene los versículos en orden (índice 0 = v1). */
export type BibleChapter = string[]
export type BibleBookData = BibleChapter[]

/** key del libro -> cantidad de versículos por capítulo. Lo genera tools/split-bible.mjs. */
export type BibleIndex = Record<string, number[]>

/** `chapter` 0-based, `verse` 1-based: coincide con el JSON y con la referencia visual. */
export interface BibleReference {
  bookKey: string
  chapter: number
  verse: number
}

export interface BibleVerse extends BibleReference {
  text: string
  reference: string
}

export interface BibleFavorite extends BibleVerse {
  createdAt: string
}

export type BibleMode = 'navegar' | 'buscar' | 'favoritos' | 'config'
export type BibleStep = 'libros' | 'capitulos' | 'lectura'

export interface BiblePreferences {
  textColor: string
  backgroundColor: string
  fontSize: number
  highlightEnabled: boolean
  highlightWord: string
}
