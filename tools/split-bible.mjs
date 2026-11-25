import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * Divide el RV1960 completo en un archivo por libro.
 *
 * `public/biblia/<key>.json` = string[][] (capítulos 0-based, versículos 0-based).
 * `public/biblia/index.json` = Record<key, number[]> con el count de versículos
 * por capítulo, para saber cuántos capítulos hay sin descargar el libro.
 */
const source = JSON.parse(readFileSync(new URL('./biblia-rv1960.json', import.meta.url), 'utf8'))
const outDir = fileURLToPath(new URL('../public/biblia/', import.meta.url))
mkdirSync(outDir, { recursive: true })

const index = {}
let verses = 0

for (const [key, chapters] of Object.entries(source)) {
  if (!/^[a-z0-9_]+$/.test(key)) throw new Error(`Clave de libro inválida: ${key}`)
  if (!Array.isArray(chapters) || chapters.length === 0) throw new Error(`Libro vacío: ${key}`)

  index[key] = chapters.map((chapter) => {
    if (!Array.isArray(chapter)) throw new Error(`Capítulo inválido en ${key}`)
    verses += chapter.length
    return chapter.length
  })

  writeFileSync(
    new URL(`../public/biblia/${key}.json`, import.meta.url),
    JSON.stringify(chapters),
  )
}

writeFileSync(new URL('../public/biblia/index.json', import.meta.url), JSON.stringify(index))
console.log(`Biblia dividida: ${Object.keys(index).length} libros, ${verses} versículos.`)
