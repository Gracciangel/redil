/**
 * Las 12 notas de la escala cromática. La paleta es propia de Redil (no de
 * onStage): cada nota tiene un color fijo para que el cifrado se lea rápido.
 */
export const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
export const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

const HUES = [
  '#ef5350', '#f28e2b', '#fdd835', '#cddc39', '#66bb6a', '#26c6da',
  '#29b6f6', '#5c6bc0', '#7e57c2', '#ab47bc', '#ec407a', '#8d6e63',
]

export const NOTE_COLORS: Record<string, string> = Object.fromEntries(
  [...SHARPS, ...FLATS].map((note, index) => [note, HUES[index % 12]]),
)

/** Equivalencia europea; el sostenido se respeta según cómo vino el acorde. */
export const EUROPEAN: Record<string, string> = {
  C: 'Do', 'C#': 'Do#', Db: 'Do♭', D: 'Re', 'D#': 'Re#', Eb: 'Mi♭',
  E: 'Mi', F: 'Fa', 'F#': 'Fa#', Gb: 'Sol♭', G: 'Sol', 'G#': 'Sol#',
  Ab: 'La♭', A: 'La', 'A#': 'La#', Bb: 'Si♭', B: 'Si',
}

/** Índice 0..11 de una nota, aceptando sostenidos y bemoles. */
export function noteIndex(note: string): number {
  const normalized = note.charAt(0).toUpperCase() + note.slice(1)
  const list = normalized.includes('b') ? FLATS : SHARPS
  const found = list.indexOf(normalized)
  return found >= 0 ? found : Math.max(0, SHARPS.indexOf(normalized))
}

export function noteName(index: number, preferFlats: boolean, european: boolean): string {
  const safe = ((index % 12) + 12) % 12
  const note = (preferFlats ? FLATS : SHARPS)[safe]
  return european ? EUROPEAN[note] ?? note : note
}
