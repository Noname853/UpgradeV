// Membuat ikon PWA (public/icons/*.png) dari desain SVG motif QR.
// Jalankan ulang bila desain ikon ingin diubah:
//   node scripts/generate-pwa-icons.mjs
// Memakai `sharp` (tersedia sebagai dependensi transitif Next untuk optimasi gambar).
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const OUT_DIR = path.join(import.meta.dirname, '..', 'public', 'icons')

// Glyph QR digambar dalam grid 9x9 modul (modul = 32px) pada area 288x288
// yang dipusatkan di kanvas 512x512. Tiga "finder pattern" khas QR + beberapa
// modul data, diwarnai gradasi brand (biru #0070f3 → ungu #7928ca).
const MODUL = 32
const AREA = 288
const ASAL = (512 - AREA) / 2

function finder(x, y) {
  // Cincin luar 96x96 (tebal 16) + titik tengah 32x32.
  return `
    <path fill-rule="evenodd" d="M${x},${y} h96 v96 h-96 z M${x + 16},${y + 16} h64 v64 h-64 z"/>
    <rect x="${x + 32}" y="${y + 32}" width="32" height="32"/>`
}

function modul(kol, bar) {
  return `<rect x="${ASAL + kol * MODUL}" y="${ASAL + bar * MODUL}" width="${MODUL}" height="${MODUL}"/>`
}

const DATA_MODUL = [
  [4, 0], [4, 2], [3, 4], [5, 4], [4, 5], [6, 4], [7, 5], [4, 7],
  [5, 6], [6, 7], [8, 5], [8, 7], [7, 8], [5, 8],
]

const GLYPH = `
  <g fill="url(#g)">
    ${finder(ASAL, ASAL)}
    ${finder(ASAL + AREA - 96, ASAL)}
    ${finder(ASAL, ASAL + AREA - 96)}
    ${DATA_MODUL.map(([k, b]) => modul(k, b)).join('\n    ')}
  </g>`

const DEFS = `
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0070f3"/>
      <stop offset="1" stop-color="#7928ca"/>
    </linearGradient>
  </defs>`

// Ikon biasa: latar rounded-rect gelap, sudut transparan.
const svgBiasa = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  ${DEFS}
  <rect x="0" y="0" width="512" height="512" rx="104" fill="#0a0a0a"/>
  <rect x="6" y="6" width="500" height="500" rx="98" fill="none" stroke="url(#g)" stroke-opacity="0.35" stroke-width="6"/>
  ${GLYPH}
</svg>`

// Ikon maskable / apple: latar full-bleed, glyph diperkecil ke safe zone
// (launcher Android/iOS yang akan memotong bentuknya sendiri).
const svgFullBleed = (skala) => `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  ${DEFS}
  <rect x="0" y="0" width="512" height="512" fill="#0a0a0a"/>
  <g transform="translate(256,256) scale(${skala}) translate(-256,-256)">${GLYPH}</g>
</svg>`

async function render(svg, ukuran, nama) {
  const png = await sharp(Buffer.from(svg)).resize(ukuran, ukuran).png().toBuffer()
  await writeFile(path.join(OUT_DIR, nama), png)
  console.log(`✓ ${nama} (${ukuran}x${ukuran})`)
}

await mkdir(OUT_DIR, { recursive: true })
await render(svgBiasa, 192, 'icon-192.png')
await render(svgBiasa, 512, 'icon-512.png')
await render(svgFullBleed(0.64), 512, 'icon-maskable-512.png')
await render(svgFullBleed(0.72), 180, 'apple-touch-icon.png')
