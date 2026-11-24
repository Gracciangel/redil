/**
 * Genera los iconos de la PWA a partir del logo de Redil.
 *
 * Fuente: public/icons/redil-logo.png (emblema + palabra, arte negro con alfa).
 * Como el arte original es negro, se usa su canal alfa como máscara y se pinta
 * en claro sobre el degradado violeta de la app. Del logo se recorta solo el
 * emblema (la parte superior), que es el que funciona a tamaños pequeños.
 *
 * Sin dependencias externas: decodifica el PNG fuente, compone a 4x y reduce
 * con filtro de caja para bordes suaves.
 *
 * Uso: npm run icons
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync, inflateSync } from 'node:zlib'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC = join(ROOT, 'public')
const ICONS = join(PUBLIC, 'icons')
const SOURCE = join(ICONS, 'redil-logo.png')

/* ------------------------------------------------------------------ */
/* Lector PNG (RGBA, 8 bits)                                           */
/* ------------------------------------------------------------------ */

function readPNG(file) {
  const buf = readFileSync(file)
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error(`${file} no es un PNG`)
  const width = buf.readUInt32BE(16)
  const height = buf.readUInt32BE(20)
  const bitDepth = buf[24]
  const colorType = buf[25]
  if (bitDepth !== 8 || colorType !== 6) {
    throw new Error(`PNG no soportado: depth=${bitDepth}, colorType=${colorType}`)
  }

  let off = 8
  const idat = []
  while (off < buf.length) {
    const len = buf.readUInt32BE(off)
    const type = buf.toString('ascii', off + 4, off + 8)
    if (type === 'IDAT') idat.push(buf.subarray(off + 8, off + 8 + len))
    off += 12 + len
  }

  const raw = inflateSync(Buffer.concat(idat))
  const bpp = 4
  const stride = width * bpp
  const pixels = Buffer.alloc(stride * height)
  const paeth = (a, b, c) => {
    const p = a + b - c
    const pa = Math.abs(p - a)
    const pb = Math.abs(p - b)
    const pc = Math.abs(p - c)
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c
  }

  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1)
    const filter = raw[rowStart]
    const row = raw.subarray(rowStart + 1, rowStart + 1 + stride)
    const out = pixels.subarray(y * stride, (y + 1) * stride)
    const prev = y > 0 ? pixels.subarray((y - 1) * stride, y * stride) : null
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[x - bpp] : 0
      const b = prev ? prev[x] : 0
      const c = prev && x >= bpp ? prev[x - bpp] : 0
      const v = row[x]
      const result =
        filter === 0
          ? v
          : filter === 1
            ? v + a
            : filter === 2
              ? v + b
              : filter === 3
                ? v + ((a + b) >> 1)
                : v + paeth(a, b, c)
      out[x] = result & 0xff
    }
  }

  return { width, height, pixels }
}

/* ------------------------------------------------------------------ */
/* Codificador PNG (RGBA, 8 bits)                                      */
/* ------------------------------------------------------------------ */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buf) {
  let crc = 0xffffffff
  for (const byte of buf) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([length, typeBuf, data, crc])
}

function encodePNG(width, height, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // truecolor + alpha

  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0 // filtro "none"
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* ------------------------------------------------------------------ */
/* Recorte del emblema                                                 */
/* ------------------------------------------------------------------ */

const source = readPNG(SOURCE)

/** Alpha de un píxel del PNG fuente. */
const sourceAlpha = (x, y) => source.pixels[(y * source.width + x) * 4 + 3] / 255

// El logo tiene dos bloques: el emblema (arriba) y la palabra "Redil" (abajo).
// Nos quedamos con el primero: es el que se lee bien a 192 px.
const rows = []
for (let y = 0; y < source.height; y++) {
  let sum = 0
  for (let x = 0; x < source.width; x++) sum += sourceAlpha(x, y)
  rows.push(sum)
}

const contentRows = []
let runStart = -1
for (let y = 0; y < source.height; y++) {
  const hasContent = rows[y] > 2
  if (hasContent && runStart < 0) runStart = y
  if (!hasContent && runStart >= 0) {
    contentRows.push([runStart, y - 1])
    runStart = -1
  }
}
if (runStart >= 0) contentRows.push([runStart, source.height - 1])

if (contentRows.length < 2) {
  throw new Error('No se pudo separar el emblema del texto del logo')
}

const [emblemTop, emblemBottom] = contentRows[0]
let emblemLeft = source.width
let emblemRight = -1
for (let y = emblemTop; y <= emblemBottom; y++) {
  for (let x = 0; x < source.width; x++) {
    if (sourceAlpha(x, y) > 0.04) {
      if (x < emblemLeft) emblemLeft = x
      if (x > emblemRight) emblemRight = x
    }
  }
}

const emblem = {
  left: emblemLeft,
  top: emblemTop,
  width: emblemRight - emblemLeft + 1,
  height: emblemBottom - emblemTop + 1,
}

console.log(
  `Emblema recortado: ${emblem.width}×${emblem.height} (x ${emblemLeft}, y ${emblemTop})`,
)

/** Alpha del emblema con interpolación bilineal (u, v en píxeles del recorte). */
function emblemAlpha(u, v) {
  const x = Math.min(emblem.width - 1, Math.max(0, u))
  const y = Math.min(emblem.height - 1, Math.max(0, v))
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const x1 = Math.min(emblem.width - 1, x0 + 1)
  const y1 = Math.min(emblem.height - 1, y0 + 1)
  const fx = x - x0
  const fy = y - y0
  const a = sourceAlpha(emblem.left + x0, emblem.top + y0)
  const b = sourceAlpha(emblem.left + x1, emblem.top + y0)
  const c = sourceAlpha(emblem.left + x0, emblem.top + y1)
  const d = sourceAlpha(emblem.left + x1, emblem.top + y1)
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy
}

/* ------------------------------------------------------------------ */
/* Composición                                                         */
/* ------------------------------------------------------------------ */

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const lerp = (a, b, t) => a + (b - a) * t

/** Distancia (aproximada) al rectángulo redondeado; negativa dentro. */
function roundedRectDistance(x, y, w, h, r) {
  const dx = Math.abs(x - w / 2) - (w / 2 - r)
  const dy = Math.abs(y - h / 2) - (h / 2 - r)
  const ox = Math.max(dx, 0)
  const oy = Math.max(dy, 0)
  return Math.min(Math.max(dx, dy), 0) + Math.hypot(ox, oy) - r
}

// Paleta del fondo: el mismo degradado de la app con un halo violeta.
const BG_TOP = [46, 10, 46] // #2e0a2e
const BG_BOTTOM = [23, 20, 20] // #171414
const GLOW = [168, 85, 247] // #a855f7
const MARK_TOP = [251, 246, 255]
const MARK_BOTTOM = [226, 208, 255]

/**
 * @param {number} size Lado final en px.
 * @param {object} options
 * @param {boolean} [options.rounded] Esquinas redondeadas (iconos "any").
 * @param {boolean} [options.background] Fondo degradado; si es false, solo la marca.
 * @param {number} [options.logoScale] Proporción del lienzo que ocupa el emblema.
 * @param {number} [options.logoY] Centro vertical del emblema (0..1).
 */
function render(size, { rounded = false, background = true, logoScale = 0.66, logoY = 0.5 } = {}) {
  const scale = 4
  const hi = size * scale
  const buf = new Uint8ClampedArray(hi * hi * 4)

  const radius = rounded ? size * 0.225 : 0
  const factor = (size * logoScale) / Math.max(emblem.width, emblem.height)
  const drawW = emblem.width * factor
  const drawH = emblem.height * factor
  const drawX = (size - drawW) / 2
  const drawY = size * logoY - drawH / 2

  for (let py = 0; py < hi; py++) {
    const y = (py + 0.5) / scale
    for (let px = 0; px < hi; px++) {
      const x = (px + 0.5) / scale
      const i = (py * hi + px) * 4

      let r = 0
      let g = 0
      let b = 0
      let a = 1

      if (background) {
        // Degradado vertical + halo violeta detrás del emblema.
        const t = clamp01(y / size)
        r = lerp(BG_TOP[0], BG_BOTTOM[0], t)
        g = lerp(BG_TOP[1], BG_BOTTOM[1], t)
        b = lerp(BG_TOP[2], BG_BOTTOM[2], t)

        const d = Math.hypot((x - size * 0.5) / (size * 0.7), (y - size * 0.42) / (size * 0.7))
        const glow = Math.max(0, 1 - d) ** 2 * 0.34
        r = lerp(r, GLOW[0], glow)
        g = lerp(g, GLOW[1], glow)
        b = lerp(b, GLOW[2], glow)

        if (rounded) {
          a = clamp01(0.5 - roundedRectDistance(x, y, size, size, radius) * scale)
        }
        if (a <= 0) continue
      } else {
        a = 0
      }

      // Marca: alpha del emblema, pintado en claro.
      const u = (x - drawX) / factor
      const v = (y - drawY) / factor
      let mark = 0
      if (u >= 0 && v >= 0 && u < emblem.width && v < emblem.height) {
        mark = emblemAlpha(u, v)
      }

      if (mark > 0) {
        const t = clamp01((y - drawY) / drawH)
        const mr = lerp(MARK_TOP[0], MARK_BOTTOM[0], t)
        const mg = lerp(MARK_TOP[1], MARK_BOTTOM[1], t)
        const mb = lerp(MARK_TOP[2], MARK_BOTTOM[2], t)
        r = lerp(r, mr, mark)
        g = lerp(g, mg, mark)
        b = lerp(b, mb, mark)
        if (!background) a = mark
      }

      buf[i] = r
      buf[i + 1] = g
      buf[i + 2] = b
      buf[i + 3] = 255 * a
    }
  }

  // Reducción 4x4 con alfa premultiplicado para evitar halos.
  const out = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          const i = ((y * scale + sy) * hi + (x * scale + sx)) * 4
          const pa = buf[i + 3] / 255
          r += buf[i] * pa
          g += buf[i + 1] * pa
          b += buf[i + 2] * pa
          a += pa
        }
      }
      const o = (y * size + x) * 4
      if (a > 0) {
        out[o] = r / a
        out[o + 1] = g / a
        out[o + 2] = b / a
      }
      out[o + 3] = Math.round((a / (scale * scale)) * 255)
    }
  }

  return encodePNG(size, size, out)
}

/* ------------------------------------------------------------------ */
/* Salida                                                              */
/* ------------------------------------------------------------------ */

mkdirSync(ICONS, { recursive: true })

const targets = [
  { file: join(ICONS, 'icon-192.png'), size: 192, rounded: true },
  { file: join(ICONS, 'icon-512.png'), size: 512, rounded: true },
  { file: join(ICONS, 'maskable-512.png'), size: 512, logoScale: 0.56, logoY: 0.5 },
  { file: join(PUBLIC, 'apple-touch-icon.png'), size: 180, logoScale: 0.62, logoY: 0.5 },
  // Marca transparente para la cabecera (sidebar/topbar).
  { file: join(ICONS, 'brand-mark.png'), size: 128, background: false, logoScale: 0.92 },
]

for (const { file, size, ...options } of targets) {
  writeFileSync(file, render(size, options))
  console.log(`✓ ${file.replace(ROOT + '\\', '')} (${size}×${size})`)
}

// Restos del set anterior (cruz verde), ya sin uso.
for (const stale of [join(ICONS, 'icon.svg'), join(PUBLIC, 'favicon.svg')]) {
  rmSync(stale, { force: true })
}
console.log('✓ Eliminados los iconos SVG antiguos')
