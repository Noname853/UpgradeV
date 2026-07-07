import { z } from 'zod'
import type ExcelJS from 'exceljs'

// ============================================================================
// Inventaris Lab: validasi + parser Excel + pengaman export.
// File Excel diperlakukan sebagai bahan impor tak tepercaya: dicerna di
// server dengan batas ukuran, isi sel dibaca sebagai teks polos (formula
// tidak pernah dievaluasi), lalu file dibuang. Data hidup di database.
// ============================================================================

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024 // selaras dengan import alat

const httpsUrl = z.preprocess(
  (v) => (v === '' || v == null ? null : v),
  z.string().url('URL tidak valid').startsWith('https://', 'URL harus diawali https://').max(2000).nullable(),
)

const angkaOpsional = z.preprocess(
  (v) => (v === '' || v == null ? null : v),
  z.coerce.number().int().min(0).max(1_000_000).nullable(),
)

// `.strict()` menolak field liar (mass assignment), pola yang sama dengan
// skema alat/unit di lib/validations.ts.
export const labItemSchema = z
  .object({
    nama: z.string().trim().min(1, 'Nama wajib diisi').max(200),
    jumlah: z.string().trim().max(50).default(''),
    baik: angkaOpsional,
    rusak: angkaOpsional,
    deskripsi: z.preprocess((v) => (v === '' || v == null ? null : v), z.string().max(1000).nullable()),
    link: httpsUrl,
    foto: httpsUrl,
  })
  .strict()

export const labItemCreateSchema = labItemSchema.extend({
  sheetId: z.coerce.number().int().positive(),
})

export const labItemUpdateSchema = labItemSchema.partial().strict()

// ============================================================================
// Parser workbook. Sheet di file lapangan strukturnya longgar (baris judul,
// merged cell, header kadang kapital) — jadi header dicari per sheet, kolom
// dipetakan dari label header, bukan posisi tetap.
// ============================================================================

export interface ParsedItem {
  nama: string
  jumlah: string
  baik: number | null
  rusak: number | null
  deskripsi: string | null
  link: string | null
}

export interface ParsedSheet {
  nama: string
  jenis: 'lab' | 'need'
  items: ParsedItem[]
}

export interface ParseResult {
  sheets: ParsedSheet[]
  totalItems: number
  skipped: number
}

// Nilai sel -> teks polos. Formula tidak dievaluasi: ambil hasil cache-nya
// bila ada, selain itu kosong. Rich text diratakan.
function cellText(v: ExcelJS.CellValue): string {
  if (v == null) return ''
  if (typeof v === 'string') return v.trim()
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(v)
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === 'object') {
    if ('richText' in v) return v.richText.map((r) => r.text).join('').trim()
    if ('result' in v) return cellText(v.result as ExcelJS.CellValue)
    if ('text' in v) return String(v.text).trim()
  }
  return ''
}

// "19", "19.0" -> 19; "--", "-", "" -> null; "4 dus" -> null (bukan angka murni)
function angka(s: string): number | null {
  const t = s.trim()
  if (!t || /^-+$/.test(t)) return null
  const n = Number(t)
  if (!Number.isFinite(n)) return null
  return Math.max(0, Math.round(n))
}

// "19.0" -> "19" agar jumlah teks tampil rapi
function rapikanJumlah(s: string): string {
  const t = s.trim().replace(/^-+$/, '')
  return /^\d+(\.0+)?$/.test(t) ? String(parseInt(t, 10)) : t
}

const HEADER_NAMA = ['nama alat', 'barang', 'nama barang']

export function parseWorkbook(wb: ExcelJS.Workbook): ParseResult {
  const sheets: ParsedSheet[] = []
  let totalItems = 0
  let skipped = 0

  wb.eachSheet((ws) => {
    // Cari baris header: baris pertama yang punya sel "Nama Alat"/"Barang".
    let headerRow = -1
    const cols: Record<string, number> = {}
    for (let r = 1; r <= Math.min(ws.rowCount, 20) && headerRow === -1; r++) {
      const row = ws.getRow(r)
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const label = cellText(cell.value).toLowerCase()
        if (HEADER_NAMA.includes(label)) {
          headerRow = r
          cols.nama = colNumber
        }
      })
      if (headerRow === r) {
        row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
          const label = cellText(cell.value).toLowerCase()
          if (label === 'jumlah') cols.jumlah = colNumber
          else if (label === 'baik') cols.baik = colNumber
          else if (label === 'rusak') cols.rusak = colNumber
          else if (label === 'deskripsi') cols.deskripsi = colNumber
          else if (label === 'link') cols.link = colNumber
        })
      }
    }
    if (headerRow === -1) {
      // Sheet tanpa header dikenal: lewati utuh (bukan error fatal).
      skipped++
      return
    }

    const jenis: 'lab' | 'need' = cols.link !== undefined && cols.baik === undefined ? 'need' : 'lab'
    const items: ParsedItem[] = []

    for (let r = headerRow + 1; r <= ws.rowCount; r++) {
      const row = ws.getRow(r)
      const nama = cellText(row.getCell(cols.nama).value).slice(0, 200)
      if (!nama) continue
      const jumlahRaw = cols.jumlah ? cellText(row.getCell(cols.jumlah).value) : ''
      const linkRaw = cols.link ? cellText(row.getCell(cols.link).value) : ''
      items.push({
        nama,
        jumlah: rapikanJumlah(jumlahRaw).slice(0, 50),
        baik: cols.baik ? angka(cellText(row.getCell(cols.baik).value)) : null,
        rusak: cols.rusak ? angka(cellText(row.getCell(cols.rusak).value)) : null,
        deskripsi: cols.deskripsi
          ? cellText(row.getCell(cols.deskripsi).value).slice(0, 1000) || null
          : null,
        // Link wajib https; nilai lain ("--", teks bebas) dibuang diam-diam.
        link: /^https:\/\/.+/i.test(linkRaw) ? linkRaw.slice(0, 2000) : null,
      })
    }

    sheets.push({ nama: ws.name.trim().slice(0, 100) || `Sheet${sheets.length + 1}`, jenis, items })
    totalItems += items.length
  })

  return { sheets, totalItems, skipped }
}

// Anti formula-injection saat export: sel teks berawalan = + - @ dibubuhi
// apostrof agar Excel menampilkannya sebagai teks, bukan mengeksekusinya.
export function amankanSel(s: string): string {
  return /^[=+\-@]/.test(s) ? `'${s}` : s
}
