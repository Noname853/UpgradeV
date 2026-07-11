import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { ArrowLeft, Upload, FileSpreadsheet, Download, CheckCircle2, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import ExcelJS from 'exceljs'

interface RowResult {
  sheet: 'Alat' | 'Unit'
  row: number
  ref: string
  action: 'created' | 'updated' | 'error'
  message?: string
}

async function importAction(formData: FormData) {
  'use server'
  const session = await auth()
  if (session?.user.role !== 'admin') redirect('/dashboard')

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) redirect('/alat/import?error=no-file')

  const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
  if (file.size > MAX_UPLOAD_BYTES) redirect('/alat/import?error=too-large')

  const ALLOWED_MIME = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ]
  if (!ALLOWED_MIME.includes(file.type)) redirect('/alat/import?error=invalid-file')

  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext !== 'xlsx' && ext !== 'xls') redirect('/alat/import?error=invalid-file')

  const arrayBuffer = await file.arrayBuffer()
  const workbook = new ExcelJS.Workbook()
  try {
    await workbook.xlsx.load(arrayBuffer as ExcelJS.Buffer)
  } catch {
    redirect('/alat/import?error=invalid-file')
  }

  const alatSheet = workbook.getWorksheet('Alat')
  const unitSheet = workbook.getWorksheet('Unit')

  if (!alatSheet && !unitSheet) {
    redirect('/alat/import?error=no-sheet')
  }

  const MAX_ROWS = 2000
  const results: RowResult[] = []
  let alatCreated = 0, alatUpdated = 0, unitCreated = 0, errors = 0

  const buildColMap = (sheet: ExcelJS.Worksheet) => {
    const colMap: Record<string, number> = {}
    sheet.getRow(1).eachCell((cell, colNumber) => {
      const key = String(cell.value ?? '').trim().toLowerCase()
      if (key) colMap[key] = colNumber
    })
    return colMap
  }

  const getCell = (row: ExcelJS.Row, colMap: Record<string, number>, key: string): string => {
    const col = colMap[key]
    if (!col) return ''
    const v = row.getCell(col).value
    if (v === null || v === undefined) return ''
    if (typeof v === 'object' && 'text' in (v as object)) return String((v as { text: string }).text)
    if (typeof v === 'object' && 'result' in (v as object)) return String((v as { result: unknown }).result)
    return String(v)
  }

  // ── Fase 1: Import Alat (jenis) ─────────────────────────────────────────
  if (alatSheet) {
    const colMap = buildColMap(alatSheet)
    if (!colMap['nama'] || !colMap['kategori']) {
      redirect('/alat/import?error=missing-alat-cols')
    }
    const total = alatSheet.rowCount
    if (total - 1 > MAX_ROWS) redirect(`/alat/import?error=too-many-rows&max=${MAX_ROWS}`)

    type ParsedAlat = { row: number; nama: string; kategori: string; lokasi: string; deskripsi: string | null }
    const parsed: ParsedAlat[] = []

    for (let i = 2; i <= total; i++) {
      const row = alatSheet.getRow(i)
      const nama = getCell(row, colMap, 'nama').trim()
      const kategori = getCell(row, colMap, 'kategori').trim()
      const lokasi = getCell(row, colMap, 'lokasi').trim()
      const deskripsi = getCell(row, colMap, 'deskripsi').trim()
      if (!nama && !kategori) continue
      if (!nama || !kategori) {
        errors++
        results.push({ sheet: 'Alat', row: i, ref: nama || '(kosong)', action: 'error', message: 'Nama dan kategori wajib diisi' })
        continue
      }
      parsed.push({ row: i, nama, kategori, lokasi, deskripsi: deskripsi || null })
    }

    if (parsed.length > 0) {
      const existing = new Set(
        (await prisma.alat.findMany({
          where: { nama: { in: parsed.map((p) => p.nama) } },
          select: { nama: true },
        })).map((a) => a.nama),
      )

      const CHUNK = 50
      for (let c = 0; c < parsed.length; c += CHUNK) {
        const chunk = parsed.slice(c, c + CHUNK)
        try {
          await prisma.$transaction(
            chunk.map((p) =>
              prisma.alat.upsert({
                where: { nama: p.nama },
                update: { kategori: p.kategori, lokasi: p.lokasi, deskripsi: p.deskripsi },
                create: { nama: p.nama, kategori: p.kategori, lokasi: p.lokasi, deskripsi: p.deskripsi },
              }),
            ),
          )
          for (const p of chunk) {
            if (existing.has(p.nama)) {
              alatUpdated++
              results.push({ sheet: 'Alat', row: p.row, ref: p.nama, action: 'updated' })
            } else {
              alatCreated++
              results.push({ sheet: 'Alat', row: p.row, ref: p.nama, action: 'created' })
            }
          }
        } catch {
          for (const p of chunk) {
            errors++
            results.push({ sheet: 'Alat', row: p.row, ref: p.nama, action: 'error', message: 'Gagal menyimpan' })
          }
        }
      }
    }
  }

  // ── Fase 2: Import Unit (fisik per alat) ────────────────────────────────
  if (unitSheet) {
    const colMap = buildColMap(unitSheet)
    if (!colMap['kode'] || !colMap['nama_alat']) {
      redirect('/alat/import?error=missing-unit-cols')
    }
    const total = unitSheet.rowCount
    if (total - 1 > MAX_ROWS) redirect(`/alat/import?error=too-many-rows&max=${MAX_ROWS}`)

    type ParsedUnit = { row: number; kode: string; namaAlat: string; kondisi: 'baik' | 'rusak'; catatan: string | null }
    const parsed: ParsedUnit[] = []

    for (let i = 2; i <= total; i++) {
      const row = unitSheet.getRow(i)
      const kode = getCell(row, colMap, 'kode').trim()
      const namaAlat = getCell(row, colMap, 'nama_alat').trim()
      const kondisiRaw = getCell(row, colMap, 'kondisi').trim().toLowerCase()
      const catatan = getCell(row, colMap, 'catatan').trim()
      if (!kode && !namaAlat) continue
      if (!kode || !namaAlat) {
        errors++
        results.push({ sheet: 'Unit', row: i, ref: kode || '(kosong)', action: 'error', message: 'Kode dan nama_alat wajib diisi' })
        continue
      }
      const kondisi: 'baik' | 'rusak' = kondisiRaw === 'rusak' ? 'rusak' : 'baik'
      parsed.push({ row: i, kode, namaAlat, kondisi, catatan: catatan || null })
    }

    if (parsed.length > 0) {
      // Lookup semua nama_alat sekaligus
      const namaUnique = Array.from(new Set(parsed.map((p) => p.namaAlat)))
      const alatRecords = await prisma.alat.findMany({
        where: { nama: { in: namaUnique } },
        select: { id: true, nama: true },
      })
      const alatMap = new Map(alatRecords.map((a) => [a.nama, a.id]))

      const existingUnits = new Set(
        (await prisma.unit.findMany({
          where: { kode: { in: parsed.map((p) => p.kode) } },
          select: { kode: true },
        })).map((u) => u.kode),
      )

      const CHUNK = 50
      for (let c = 0; c < parsed.length; c += CHUNK) {
        const chunk = parsed.slice(c, c + CHUNK)
        try {
          await prisma.$transaction(async (tx) => {
            for (const p of chunk) {
              const alatId = alatMap.get(p.namaAlat)
              if (!alatId) {
                errors++
                results.push({ sheet: 'Unit', row: p.row, ref: p.kode, action: 'error', message: `Alat "${p.namaAlat}" tidak ditemukan di sheet Alat` })
                continue
              }
              if (existingUnits.has(p.kode)) {
                errors++
                results.push({ sheet: 'Unit', row: p.row, ref: p.kode, action: 'error', message: 'Kode unit sudah ada' })
                continue
              }
              await tx.unit.create({
                data: { kode: p.kode, alatId, kondisi: p.kondisi, catatan: p.catatan },
              })
              unitCreated++
              results.push({ sheet: 'Unit', row: p.row, ref: p.kode, action: 'created' })
            }
          })
        } catch {
          for (const p of chunk) {
            errors++
            results.push({ sheet: 'Unit', row: p.row, ref: p.kode, action: 'error', message: 'Gagal menyimpan' })
          }
        }
      }
    }
  }

  const params = new URLSearchParams({
    alatCreated: String(alatCreated),
    alatUpdated: String(alatUpdated),
    unitCreated: String(unitCreated),
    errors: String(errors),
    log: JSON.stringify(results.slice(0, 80)),
  })
  redirect(`/alat/import?${params.toString()}`)
}

export default async function ImportAlatPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string
    max?: string
    alatCreated?: string
    alatUpdated?: string
    unitCreated?: string
    errors?: string
    log?: string
  }>
}) {
  const session = await auth()
  if (session?.user.role !== 'admin') redirect('/dashboard')

  const sp = await searchParams
  const hasResult = sp.alatCreated !== undefined || sp.unitCreated !== undefined
  const alatCreated = parseInt(sp.alatCreated ?? '0')
  const alatUpdated = parseInt(sp.alatUpdated ?? '0')
  const unitCreated = parseInt(sp.unitCreated ?? '0')
  const errorsCount = parseInt(sp.errors ?? '0')
  let log: RowResult[] = []
  try {
    if (sp.log) log = JSON.parse(sp.log)
  } catch {}

  const errorMsg =
    sp.error === 'no-file'
      ? 'File belum dipilih'
      : sp.error === 'too-large'
        ? 'File terlalu besar. Maksimal 5 MB'
        : sp.error === 'invalid-file'
          ? 'Format file tidak valid. Pastikan file .xlsx'
          : sp.error === 'no-sheet'
            ? 'File harus berisi sheet "Alat" dan/atau "Unit"'
            : sp.error === 'missing-alat-cols'
              ? 'Sheet "Alat" harus punya kolom: nama, kategori'
              : sp.error === 'missing-unit-cols'
                ? 'Sheet "Unit" harus punya kolom: kode, nama_alat'
                : sp.error === 'too-many-rows'
                  ? `Terlalu banyak baris. Maksimal ${sp.max ?? '2000'} baris per sheet.`
                  : null

  return (
    <div className="pb-8">
      <div className="mb-5 flex items-center gap-3 hud-rise">
        <Link
          href="/alat"
          className="hud-clip-sm flex h-[38px] w-[38px] items-center justify-center"
          style={{ color: '#8a97a3', border: '1px solid rgba(99,102,241,0.25)' }}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="hud-title" style={{ fontSize: 22 }}>Import Inventaris dari Excel</h1>
          <p className="mt-1 text-[13px]" style={{ color: '#8a97a3' }}>Upload satu file .xlsx berisi 2 sheet: <b>Alat</b> & <b>Unit</b></p>
        </div>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        <div className="hud-panel hud-accent-top hud-rise p-6" style={{ gridColumn: 'span 2 / span 2' }}>
          <form action={importAction} className="space-y-5">
            <div>
              <label className="mb-2.5 block text-sm font-semibold" style={{ color: '#b3bdc7' }}>Pilih file Excel</label>
              <input
                name="file"
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                required
                className="hud-input block w-full cursor-pointer text-sm file:mr-4 file:cursor-pointer file:border-0 file:bg-gradient-to-r file:from-blue-600 file:to-purple-600 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:brightness-110"
              />
              <p className="mt-2 text-xs" style={{ color: '#6b7785' }}>
                Maksimal 5 MB &amp; 2000 baris per sheet. Hanya format .xlsx.
              </p>
            </div>

            {errorMsg && (
              <p
                className="hud-clip-sm flex items-center gap-2 px-3 py-2 text-sm"
                style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}
              >
                <AlertTriangle className="h-4 w-4" />
                {errorMsg}
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <button type="submit" className="hud-btn-primary flex items-center gap-2 px-[18px] py-3 text-[12px]">
                <Upload className="h-4 w-4" />
                Upload & Import
              </button>
              <Link
                href="/api/alat/template"
                prefetch={false}
                className="hud-btn-ghost flex items-center gap-2 px-[18px] py-3 text-[12px]"
              >
                <Download className="h-4 w-4" />
                Download Template
              </Link>
            </div>
          </form>
        </div>

        <div className="hud-panel hud-rise p-[22px]">
          <div className="mb-3 flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" style={{ color: '#5c84ff' }} />
            <h2 className="hud-label text-[11px]" style={{ color: '#c3ccd6' }}>Format File</h2>
          </div>
          <p className="mb-3.5 text-[12.5px] leading-relaxed" style={{ color: '#8a97a3' }}>
            File Excel berisi <b style={{ color: '#e8edf2' }}>2 sheet</b>:
          </p>

          <div className="mb-3 hud-clip-sm p-2.5" style={{ border: '1px solid rgba(99,102,241,0.16)' }}>
            <p className="mb-2 text-[11px] font-bold" style={{ color: '#9bb3ff', letterSpacing: 1 }}>SHEET &quot;ALAT&quot; — jenis alat</p>
            <div className="flex flex-col gap-[6px] text-xs">
              <div className="flex items-center gap-2"><span className="px-2 py-0.5 font-mono" style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)' }}>nama</span><span style={{ color: '#6b7785' }}>wajib, unik</span></div>
              <div className="flex items-center gap-2"><span className="px-2 py-0.5 font-mono" style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)' }}>kategori</span><span style={{ color: '#6b7785' }}>wajib</span></div>
              <div className="flex items-center gap-2"><span className="px-2 py-0.5 font-mono" style={{ color: '#8a97a3', background: 'rgba(99,102,241,0.1)' }}>lokasi</span><span style={{ color: '#6b7785' }}>opsional</span></div>
              <div className="flex items-center gap-2"><span className="px-2 py-0.5 font-mono" style={{ color: '#8a97a3', background: 'rgba(99,102,241,0.1)' }}>deskripsi</span><span style={{ color: '#6b7785' }}>opsional</span></div>
            </div>
          </div>

          <div className="hud-clip-sm p-2.5" style={{ border: '1px solid rgba(99,102,241,0.16)' }}>
            <p className="mb-2 text-[11px] font-bold" style={{ color: '#9bb3ff', letterSpacing: 1 }}>SHEET &quot;UNIT&quot; — unit fisik per alat</p>
            <div className="flex flex-col gap-[6px] text-xs">
              <div className="flex items-center gap-2"><span className="px-2 py-0.5 font-mono" style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)' }}>kode</span><span style={{ color: '#6b7785' }}>wajib, unik</span></div>
              <div className="flex items-center gap-2"><span className="px-2 py-0.5 font-mono" style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)' }}>nama_alat</span><span style={{ color: '#6b7785' }}>wajib, harus cocok dgn sheet Alat</span></div>
              <div className="flex items-center gap-2"><span className="px-2 py-0.5 font-mono" style={{ color: '#8a97a3', background: 'rgba(99,102,241,0.1)' }}>kondisi</span><span style={{ color: '#6b7785' }}>baik / rusak (default baik)</span></div>
              <div className="flex items-center gap-2"><span className="px-2 py-0.5 font-mono" style={{ color: '#8a97a3', background: 'rgba(99,102,241,0.1)' }}>catatan</span><span style={{ color: '#6b7785' }}>opsional</span></div>
            </div>
          </div>

          <p className="mt-3 text-xs" style={{ color: '#6b7785' }}>
            Sheet Alat diproses dulu, lalu Unit. Nama alat yang sudah ada akan diperbarui (kategori/lokasi/deskripsi).
          </p>
        </div>
      </div>

      {hasResult && (
        <div className="hud-panel hud-rise mt-4 p-6">
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" style={{ color: '#22c55e' }} />
            <h2 className="hud-label text-[12px]" style={{ color: '#c3ccd6' }}>Hasil Import</h2>
          </div>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="hud-clip-sm p-3 text-center" style={{ border: '1px solid rgba(34,197,94,0.2)', background: 'rgba(34,197,94,0.05)' }}>
              <p className="hud-title text-[22px]" style={{ color: '#22c55e' }}>{alatCreated}</p>
              <p className="text-xs" style={{ color: '#6b7785' }}>Alat dibuat</p>
            </div>
            <div className="hud-clip-sm p-3 text-center" style={{ border: '1px solid rgba(59,130,246,0.2)', background: 'rgba(59,130,246,0.05)' }}>
              <p className="hud-title text-[22px]" style={{ color: '#3b82f6' }}>{alatUpdated}</p>
              <p className="text-xs" style={{ color: '#6b7785' }}>Alat update</p>
            </div>
            <div className="hud-clip-sm p-3 text-center" style={{ border: '1px solid rgba(34,197,94,0.2)', background: 'rgba(34,197,94,0.05)' }}>
              <p className="hud-title text-[22px]" style={{ color: '#22c55e' }}>{unitCreated}</p>
              <p className="text-xs" style={{ color: '#6b7785' }}>Unit dibuat</p>
            </div>
            <div className="hud-clip-sm p-3 text-center" style={{ border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' }}>
              <p className="hud-title text-[22px]" style={{ color: '#ef4444' }}>{errorsCount}</p>
              <p className="text-xs" style={{ color: '#6b7785' }}>Gagal</p>
            </div>
          </div>

          {log.length > 0 && (
            <div className="hud-clip-sm max-h-80 overflow-y-auto" style={{ border: '1px solid rgba(99,102,241,0.16)' }}>
              <table className="w-full text-xs">
                <thead className="sticky top-0" style={{ background: '#0e0f14' }}>
                  <tr className="text-left">
                    <th className="px-3 py-2" style={{ color: '#6b7785' }}>Sheet</th>
                    <th className="px-3 py-2" style={{ color: '#6b7785' }}>Baris</th>
                    <th className="px-3 py-2" style={{ color: '#6b7785' }}>Referensi</th>
                    <th className="px-3 py-2" style={{ color: '#6b7785' }}>Status</th>
                    <th className="px-3 py-2" style={{ color: '#6b7785' }}>Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {log.map((r, i) => (
                    <tr key={i} style={{ borderTop: '1px solid rgba(99,102,241,0.12)' }}>
                      <td className="px-3 py-2 font-mono" style={{ color: r.sheet === 'Alat' ? '#5c84ff' : '#a855f7' }}>{r.sheet}</td>
                      <td className="px-3 py-2" style={{ color: '#8a97a3' }}>{r.row}</td>
                      <td className="px-3 py-2 font-mono" style={{ color: '#c3ccd6' }}>{r.ref}</td>
                      <td className="px-3 py-2">
                        {r.action === 'created' && <span style={{ color: '#22c55e' }}>Dibuat</span>}
                        {r.action === 'updated' && <span style={{ color: '#3b82f6' }}>Update</span>}
                        {r.action === 'error' && <span style={{ color: '#ef4444' }}>Gagal</span>}
                      </td>
                      <td className="px-3 py-2" style={{ color: '#6b7785' }}>{r.message ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/alat" className="hud-btn-primary px-[18px] py-3 text-[12px]">
              Lihat Daftar Alat
            </Link>
            <Link href="/alat/import" className="hud-btn-ghost px-[18px] py-3 text-[12px]">
              Import Lagi
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
