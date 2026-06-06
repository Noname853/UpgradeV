import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { GlassCard } from '@/components/shared/GlassCard'
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

  const totalRows = sheet.rowCount
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
      results.push({
        row: i,
        kode: kode || '(kosong)',
        action: 'error',
        message: 'Kode, nama, dan kategori wajib diisi',
      })
      continue
    }

    const stok = stokRaw ? parseInt(stokRaw, 10) : 0
    const stokValue = isNaN(stok) ? 0 : Math.max(0, stok)

    try {
      const existing = await prisma.alat.findUnique({ where: { kode } })
      await prisma.alat.upsert({
        where: { kode },
        update: { nama, kategori, stok: stokValue, lokasi, deskripsi: deskripsi || null },
        create: { kode, nama, kategori, stok: stokValue, lokasi, deskripsi: deskripsi || null },
      })
      if (existing) {
        updated++
        results.push({ row: i, kode, action: 'updated' })
      } else {
        created++
        results.push({ row: i, kode, action: 'created' })
      }
    } catch (err) {
      errors++
      results.push({
        row: i,
        kode,
        action: 'error',
        message: err instanceof Error ? err.message : 'Gagal menyimpan',
      })
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
  searchParams: Promise<{ error?: string; cols?: string; created?: string; updated?: string; errors?: string; log?: string }>
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
      : sp.error === 'invalid-file'
        ? 'Format file tidak valid. Pastikan file .xlsx'
        : sp.error === 'empty'
          ? 'File Excel kosong'
          : sp.error === 'missing-columns'
            ? `Kolom wajib hilang: ${sp.cols ?? ''}`
            : null

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <Link href="/alat" className="rounded-lg border border-neutral-800 p-2 text-neutral-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Import Alat dari Excel</h1>
          <p className="text-sm text-neutral-400">Upload file .xlsx untuk menambah/memperbarui data alat secara massal</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <GlassCard className="p-6 lg:col-span-2">
          <form action={importAction} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-300">Pilih file Excel</label>
              <input
                name="file"
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                required
                className="block w-full cursor-pointer rounded-lg border border-neutral-700 bg-white/[0.03] text-sm text-neutral-300 file:mr-4 file:cursor-pointer file:border-0 file:bg-gradient-to-r file:from-blue-600 file:to-purple-600 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:from-blue-500 hover:file:to-purple-500"
              />
              <p className="mt-2 text-xs text-neutral-500">
                Maksimal 1MB. Hanya format .xlsx yang didukung.
              </p>
            </div>

            {errorMsg && (
              <p className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                <AlertTriangle className="h-4 w-4" />
                {errorMsg}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:from-blue-500 hover:to-purple-500"
              >
                <Upload className="h-4 w-4" />
                Upload & Import
              </button>
              <Link
                href="/api/alat/template"
                prefetch={false}
                className="flex items-center gap-2 rounded-lg border border-neutral-700 px-5 py-2.5 text-sm text-neutral-300 transition hover:border-neutral-600 hover:text-white"
              >
                <Download className="h-4 w-4" />
                Download Template
              </Link>
            </div>
          </form>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="mb-3 flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-white">Format Excel</h2>
          </div>
          <p className="mb-3 text-xs text-neutral-400">
            Baris pertama harus berupa header dengan nama kolom berikut:
          </p>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="rounded bg-red-500/10 px-2 py-0.5 font-mono text-red-400">kode</span>
              <span className="text-neutral-500">wajib, unik</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-red-500/10 px-2 py-0.5 font-mono text-red-400">nama</span>
              <span className="text-neutral-500">wajib</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-red-500/10 px-2 py-0.5 font-mono text-red-400">kategori</span>
              <span className="text-neutral-500">wajib</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-neutral-700/50 px-2 py-0.5 font-mono text-neutral-400">stok</span>
              <span className="text-neutral-500">angka, default 0</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-neutral-700/50 px-2 py-0.5 font-mono text-neutral-400">lokasi</span>
              <span className="text-neutral-500">opsional</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-neutral-700/50 px-2 py-0.5 font-mono text-neutral-400">deskripsi</span>
              <span className="text-neutral-500">opsional</span>
            </div>
          </div>
          <p className="mt-4 text-xs text-neutral-500">
            Jika <code className="rounded bg-neutral-800 px-1">kode</code> sudah ada, data akan diperbarui.
          </p>
        </GlassCard>
      </div>

      {hasResult && (
        <GlassCard className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-400" />
            <h2 className="text-sm font-semibold text-white">Hasil Import</h2>
          </div>
          <div className="mb-4 grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3 text-center">
              <p className="text-2xl font-bold text-green-400">{created}</p>
              <p className="text-xs text-neutral-500">Ditambahkan</p>
            </div>
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-center">
              <p className="text-2xl font-bold text-blue-400">{updated}</p>
              <p className="text-xs text-neutral-500">Diperbarui</p>
            </div>
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-center">
              <p className="text-2xl font-bold text-red-400">{errorsCount}</p>
              <p className="text-xs text-neutral-500">Gagal</p>
            </div>
          </div>

          {log.length > 0 && (
            <div className="max-h-80 overflow-y-auto rounded-lg border border-neutral-800">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-neutral-900">
                  <tr className="text-left">
                    <th className="px-3 py-2 text-neutral-500">Baris</th>
                    <th className="px-3 py-2 text-neutral-500">Kode</th>
                    <th className="px-3 py-2 text-neutral-500">Status</th>
                    <th className="px-3 py-2 text-neutral-500">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {log.map((r, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-neutral-400">{r.row}</td>
                      <td className="px-3 py-2 font-mono text-neutral-300">{r.kode}</td>
                      <td className="px-3 py-2">
                        {r.action === 'created' && <span className="text-green-400">Ditambahkan</span>}
                        {r.action === 'updated' && <span className="text-blue-400">Diperbarui</span>}
                        {r.action === 'error' && <span className="text-red-400">Gagal</span>}
                      </td>
                      <td className="px-3 py-2 text-neutral-500">{r.message ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex gap-3">
            <Link
              href="/alat"
              className="rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:from-blue-500 hover:to-purple-500"
            >
              Lihat Daftar Alat
            </Link>
            <Link
              href="/alat/import"
              className="rounded-lg border border-neutral-700 px-5 py-2.5 text-sm text-neutral-300 transition hover:border-neutral-600 hover:text-white"
            >
              Import Lagi
            </Link>
          </div>
        </GlassCard>
      )}
    </div>
  )
}
