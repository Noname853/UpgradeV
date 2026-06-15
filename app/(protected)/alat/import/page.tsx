import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { ArrowLeft, Upload, FileSpreadsheet, Download, CheckCircle2, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import ExcelJS from 'exceljs'

interface RowResult {
  row: number
  kode: string
  action: 'created' | 'updated' | 'error'
  message?: string
}

async function importAction(formData: FormData) {
  'use server'
  const session = await auth()
  if (session?.user.role !== 'admin') redirect('/dashboard')

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) redirect('/alat/import?error=no-file')

  const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 // 5 MB
  if (file.size > MAX_UPLOAD_BYTES) redirect('/alat/import?error=too-large')

  const ALLOWED_MIME = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ]
  if (!ALLOWED_MIME.includes(file.type)) redirect('/alat/import?error=invalid-file')

  // Also guard by extension in case the browser sends a wrong MIME type
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext !== 'xlsx' && ext !== 'xls') redirect('/alat/import?error=invalid-file')

  const arrayBuffer = await file.arrayBuffer()
  const workbook = new ExcelJS.Workbook()

  try {
    await workbook.xlsx.load(arrayBuffer as ExcelJS.Buffer)
  } catch {
    redirect('/alat/import?error=invalid-file')
  }

  const sheet = workbook.worksheets[0]
  if (!sheet) redirect('/alat/import?error=empty')

  const results: RowResult[] = []
  let created = 0
  let updated = 0
  let errors = 0

  const headerRow = sheet.getRow(1)
  const colMap: Record<string, number> = {}
  headerRow.eachCell((cell, colNumber) => {
    const key = String(cell.value ?? '').trim().toLowerCase()
    if (key) colMap[key] = colNumber
  })

  const required = ['kode', 'nama', 'kategori']
  const missing = required.filter((k) => !colMap[k])
  if (missing.length > 0) {
    redirect(`/alat/import?error=missing-columns&cols=${missing.join(',')}`)
  }

  // Batasi jumlah baris agar file besar tidak memicu ribuan operasi DB (DoS).
  const MAX_ROWS = 2000
  const totalRows = sheet.rowCount
  if (totalRows - 1 > MAX_ROWS) {
    redirect(`/alat/import?error=too-many-rows&max=${MAX_ROWS}`)
  }

  // Fase 1: baca & validasi semua baris di memori dulu.
  type ParsedRow = { row: number; kode: string; nama: string; kategori: string; stok: number; lokasi: string; deskripsi: string | null }
  const parsedRows: ParsedRow[] = []

  for (let i = 2; i <= totalRows; i++) {
    const row = sheet.getRow(i)
    const getCell = (key: string) => {
      const col = colMap[key]
      if (!col) return ''
      const v = row.getCell(col).value
      if (v === null || v === undefined) return ''
      if (typeof v === 'object' && 'text' in (v as object)) return String((v as { text: string }).text)
      if (typeof v === 'object' && 'result' in (v as object)) return String((v as { result: unknown }).result)
      return String(v)
    }

    const kode = getCell('kode').trim()
    const nama = getCell('nama').trim()
    const kategori = getCell('kategori').trim()
    const stokRaw = getCell('stok').trim()
    const lokasi = getCell('lokasi').trim()
    const deskripsi = getCell('deskripsi').trim()

    if (!kode && !nama && !kategori) continue

    if (!kode || !nama || !kategori) {
      errors++
      results.push({ row: i, kode: kode || '(kosong)', action: 'error', message: 'Kode, nama, dan kategori wajib diisi' })
      continue
    }

    const stok = stokRaw ? parseInt(stokRaw, 10) : 0
    const stokValue = isNaN(stok) ? 0 : Math.max(0, stok)
    parsedRows.push({ row: i, kode, nama, kategori, stok: stokValue, lokasi, deskripsi: deskripsi || null })
  }

  // Fase 2: satu query untuk tahu kode mana yang sudah ada (created vs updated),
  // menggantikan satu findUnique per baris.
  const existingKodes = new Set(
    parsedRows.length > 0
      ? (await prisma.alat.findMany({
          where: { kode: { in: parsedRows.map((r) => r.kode) } },
          select: { kode: true },
        })).map((a) => a.kode)
      : [],
  )

  // Fase 3: tulis dalam batch transaksi (chunk) agar tidak ribuan round-trip lepas.
  const CHUNK = 50
  for (let c = 0; c < parsedRows.length; c += CHUNK) {
    const chunk = parsedRows.slice(c, c + CHUNK)
    try {
      await prisma.$transaction(
        chunk.map((r) =>
          prisma.alat.upsert({
            where: { kode: r.kode },
            update: { nama: r.nama, kategori: r.kategori, stok: r.stok, lokasi: r.lokasi, deskripsi: r.deskripsi },
            create: { kode: r.kode, nama: r.nama, kategori: r.kategori, stok: r.stok, lokasi: r.lokasi, deskripsi: r.deskripsi },
          }),
        ),
      )
      for (const r of chunk) {
        if (existingKodes.has(r.kode)) {
          updated++
          results.push({ row: r.row, kode: r.kode, action: 'updated' })
        } else {
          created++
          results.push({ row: r.row, kode: r.kode, action: 'created' })
        }
      }
    } catch {
      // Pesan generik — jangan bocorkan detail error DB ke admin.
      for (const r of chunk) {
        errors++
        results.push({ row: r.row, kode: r.kode, action: 'error', message: 'Gagal menyimpan' })
      }
    }
  }

  const params = new URLSearchParams({
    created: String(created),
    updated: String(updated),
    errors: String(errors),
    log: JSON.stringify(results.slice(0, 50)),
  })
  redirect(`/alat/import?${params.toString()}`)
}

export default async function ImportAlatPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; cols?: string; max?: string; created?: string; updated?: string; errors?: string; log?: string }>
}) {
  const session = await auth()
  if (session?.user.role !== 'admin') redirect('/dashboard')

  const sp = await searchParams
  const hasResult = sp.created !== undefined
  const created = parseInt(sp.created ?? '0')
  const updated = parseInt(sp.updated ?? '0')
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
          : sp.error === 'empty'
            ? 'File Excel kosong'
            : sp.error === 'missing-columns'
              ? `Kolom wajib hilang: ${sp.cols ?? ''}`
              : sp.error === 'too-many-rows'
                ? `Terlalu banyak baris. Maksimal ${sp.max ?? '2000'} baris per impor.`
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
          <h1 className="hud-title" style={{ fontSize: 22 }}>Import Alat dari Excel</h1>
          <p className="mt-1 text-[13px]" style={{ color: '#8a97a3' }}>Upload file .xlsx untuk menambah / memperbarui data alat secara massal</p>
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
                Maksimal 5 MB &amp; 2000 baris. Hanya format .xlsx yang didukung.
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
            <h2 className="hud-label text-[11px]" style={{ color: '#c3ccd6' }}>Format Excel</h2>
          </div>
          <p className="mb-3.5 text-[12.5px] leading-relaxed" style={{ color: '#8a97a3' }}>
            Baris pertama harus berupa header dengan nama kolom berikut:
          </p>
          <div className="flex flex-col gap-[9px] text-xs">
            <div className="flex items-center gap-2.5">
              <span className="px-2 py-0.5 font-mono" style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)' }}>kode</span>
              <span style={{ color: '#6b7785' }}>wajib, unik</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="px-2 py-0.5 font-mono" style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)' }}>nama</span>
              <span style={{ color: '#6b7785' }}>wajib</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="px-2 py-0.5 font-mono" style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)' }}>kategori</span>
              <span style={{ color: '#6b7785' }}>wajib</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="px-2 py-0.5 font-mono" style={{ color: '#8a97a3', background: 'rgba(99,102,241,0.1)' }}>stok</span>
              <span style={{ color: '#6b7785' }}>angka, default 0</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="px-2 py-0.5 font-mono" style={{ color: '#8a97a3', background: 'rgba(99,102,241,0.1)' }}>lokasi</span>
              <span style={{ color: '#6b7785' }}>opsional</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="px-2 py-0.5 font-mono" style={{ color: '#8a97a3', background: 'rgba(99,102,241,0.1)' }}>deskripsi</span>
              <span style={{ color: '#6b7785' }}>opsional</span>
            </div>
          </div>
          <p className="mt-4 text-xs" style={{ color: '#6b7785' }}>
            Jika <code className="px-1" style={{ background: 'rgba(99,102,241,0.12)' }}>kode</code> sudah ada, data akan diperbarui.
          </p>
        </div>
      </div>

      {hasResult && (
        <div className="hud-panel hud-rise mt-4 p-6">
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" style={{ color: '#22c55e' }} />
            <h2 className="hud-label text-[12px]" style={{ color: '#c3ccd6' }}>Hasil Import</h2>
          </div>
          <div className="mb-4 grid grid-cols-3 gap-3">
            <div className="hud-clip-sm p-3 text-center" style={{ border: '1px solid rgba(34,197,94,0.2)', background: 'rgba(34,197,94,0.05)' }}>
              <p className="hud-title text-[24px]" style={{ color: '#22c55e' }}>{created}</p>
              <p className="text-xs" style={{ color: '#6b7785' }}>Ditambahkan</p>
            </div>
            <div className="hud-clip-sm p-3 text-center" style={{ border: '1px solid rgba(59,130,246,0.2)', background: 'rgba(59,130,246,0.05)' }}>
              <p className="hud-title text-[24px]" style={{ color: '#3b82f6' }}>{updated}</p>
              <p className="text-xs" style={{ color: '#6b7785' }}>Diperbarui</p>
            </div>
            <div className="hud-clip-sm p-3 text-center" style={{ border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' }}>
              <p className="hud-title text-[24px]" style={{ color: '#ef4444' }}>{errorsCount}</p>
              <p className="text-xs" style={{ color: '#6b7785' }}>Gagal</p>
            </div>
          </div>

          {log.length > 0 && (
            <div className="hud-clip-sm max-h-80 overflow-y-auto" style={{ border: '1px solid rgba(99,102,241,0.16)' }}>
              <table className="w-full text-xs">
                <thead className="sticky top-0" style={{ background: '#0e0f14' }}>
                  <tr className="text-left">
                    <th className="px-3 py-2" style={{ color: '#6b7785' }}>Baris</th>
                    <th className="px-3 py-2" style={{ color: '#6b7785' }}>Kode</th>
                    <th className="px-3 py-2" style={{ color: '#6b7785' }}>Status</th>
                    <th className="px-3 py-2" style={{ color: '#6b7785' }}>Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {log.map((r, i) => (
                    <tr key={i} style={{ borderTop: '1px solid rgba(99,102,241,0.12)' }}>
                      <td className="px-3 py-2" style={{ color: '#8a97a3' }}>{r.row}</td>
                      <td className="px-3 py-2 font-mono" style={{ color: '#c3ccd6' }}>{r.kode}</td>
                      <td className="px-3 py-2">
                        {r.action === 'created' && <span style={{ color: '#22c55e' }}>Ditambahkan</span>}
                        {r.action === 'updated' && <span style={{ color: '#3b82f6' }}>Diperbarui</span>}
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
