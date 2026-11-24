/** Modelo del cancionero. La vista no conoce SQL ni permisos. */
export interface SongSummary {
  id: string
  title: string
  artist: string | null
  originalKey: string
  lyrics: string
}

export interface SongSheetData extends Omit<SongSummary, 'lyrics'> {
  content: string
  semitones: number
}

export interface SongbookMinistry {
  id: string
  name: string
  usesSongbook: boolean
}

export type Notation = 'american' | 'european'

/** Datos editables de una canción, compartidos por formulario y servicios. */
export interface SongInput {
  title: string
  artist: string
  originalKey: string
  content: string
}

export interface LyricSegment {
  chord: string | null
  text: string
}

export interface LyricLine {
  segments: LyricSegment[]
}
