import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import ExcelJS from 'exceljs'
import bcrypt from 'bcryptjs'

interface RowResult {
  row: number
  ref: string
  action: 'created' | 'skipped' | 'error'
  message?: string
}

async function importAction(formData: FormData) {
  'use server'
  const session = await auth()
  if (session?.user.role !== 'admin') redirect('/dashboard')

  const file = formData.get('file') as File | null
  const kelasDefault = String(formData.get('kelas') ?? '').trim()
  if (!file || file.size === 0) redirect('/users/import?error=no-file')

  const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
  if (file.size > MAX_UPLOAD_BYTES) redirect('/users/import?error=too-large')

  const ALLOWED_MIME = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ]
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!ALLOWED_MIME.includes(file.type) || (ext !== 'xlsx' && ext !== 'xls'))
    redirect('/users/import?error=invalid-file')

  const arrayBuffer = await file.arrayBuffer()
  const workbook = new ExcelJS.Workbook()
  try {
    await workbook.xlsx.load(arrayBuffer as ExcelJS.Buffer)
  } catch {
    redirect('/users/import?error=invalid-file')
  }

  // Pakai sheet pertama (nama sheet bebas: Lab1/Lab2/dst).
  const sheet = workbook.worksheets[0]
  if (!sheet) redirect('/users/import?error=no-sheet')

  const colMap: Record<string, number> = {}
  sheet.getRow(1).eachCell((cell, colNumber) => {
    const key = String(cell.value ?? '').trim().toLowerCase()
    if (key) colMap[key] = colNumber
  })
  if (!colMap['email'] || !colMap['password'])
    redirect('/users/import?error=missing-cols')

  const getCell = (row: ExcelJS.Row, key: string): string => {
    const col = colMap[key]
    if (!col) return ''
    const v = row.getCell(col).value
    if (v === null || v === undefined) return ''
    if (typeof v === 'object' && 'text' in (v as object)) return String((v as { text: string }).text)
    if (typeof v === 'object' && 'result' in (v as object)) return String((v as { result: unknown }).result)
    return String(v)
  }

  const MAX_ROWS = 2000
  const total = sheet.rowCount
  if (total - 1 > MAX_ROWS) redirect(`/users/import?error=too-many-rows&max=${MAX_ROWS}`)

  const results: RowResult[] = []
  let created = 0, skipped = 0, errors = 0

  type Parsed = { row: number; name: string; email: string; password: string; kelas: string | null }
  const parsed: Parsed[] = []
  const seen = new Set<string>()

  for (let i = 2; i <= total; i++) {
    const row = sheet.getRow(i)
    const email = getCell(row, 'email').trim().toLowerCase()
    const password = getCell(row, 'password').trim()
    const username = getCell(row, 'username').trim()
    const kelasRow = getCell(row, 'kelas').trim()
    if (!email && !password) continue
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      errors++
      results.push({ row: i, ref: email || '(kosong)', action: 'error', message: 'Email tidak valid' })
      continue
    }
    if (!password || password.length < 6) {
      errors++
      results.push({ row: i, ref: email, action: 'error', message: 'Password kosong / kurang dari 6 karakter' })
      continue
    }
    if (seen.has(email)) {
      skipped++
      results.push({ row: i, ref: email, action: 'skipped', message: 'Email ganda di file' })
      continue
    }
    seen.add(email)
    parsed.push({
      row: i,
      name: username || email.split('@')[0],
      email,
      password,
      kelas: kelasRow || kelasDefault || null,
    })
  }

  if (parsed.length > 0) {
    // Lewati email yang sudah ada di database (tidak menimpa akun lama).
    const existing = new Set(
      (await prisma.user.findMany({
        where: { email: { in: parsed.map((p) => p.email) } },
        select: { email: true },
      })).map((u) => u.email.toLowerCase()),
    )

    const toCreate = parsed.filter((p) => {
      if (existing.has(p.email)) {
        skipped++
        results.push({ row: p.row, ref: p.email, action: 'skipped', message: 'Email sudah terdaftar' })
        return false
      }
      return true
    })

    // Hash password di luar transaksi (operasi berat).
    const hashed = await Promise.all(
      toCreate.map(async (p) => ({ ...p, hash: await bcrypt.hash(p.password, 10) })),
    )

    const CHUNK = 50
    for (let c = 0; c < hashed.length; c += CHUNK) {
      const chunk = hashed.slice(c, c + CHUNK)
      try {
        await prisma.$transaction(
          chunk.map((p) =>
            prisma.user.create({
              data: {
                name: p.name,
                email: p.email,
                password: p.hash,
                role: 'siswa',
                kelas: p.kelas,
              },
            }),
          ),
        )
        for (const p of chunk) {
          created++
          results.push({ row: p.row, ref: p.email, action: 'created' })
        }
      } catch {
        for (const p of chunk) {
          errors++
          results.push({ row: p.row, ref: p.email, action: 'error', message: 'Gagal menyimpan' })
        }
      }
    }
  }

  const params = new URLSearchParams({
    created: String(created),
    skipped: String(skipped),
    errors: String(errors),
    log: JSON.stringify(results.slice(0, 100)),
  })
  redirect(`/users/import?${params.toString()}`)
}

export default async function ImportUsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string
    max?: string
    created?: string
    skipped?: string
    errors?: string
    log?: string
  }>
}) {
  const session = await auth()
  if (session?.user.role !== 'admin') redirect('/dashboard')

  const sp = await searchParams
  const hasResult = sp.created !== undefined
  const created = parseInt(sp.created ?? '0')
  const skipped = parseInt(sp.skipped ?? '0')
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
            ? 'File tidak berisi sheet apa pun'
            : sp.error === 'missing-cols'
              ? 'File harus punya kolom: email, password (Username & Kelas opsional)'
              : sp.error === 'too-many-rows'
                ? `Terlalu banyak baris. Maksimal ${sp.max ?? '2000'}.`
                : null

  return (
    <div className="pb-8">
      <div className="mb-5 flex items-center gap-3 hud-rise">
        <Link
          href="/users"
          className="hud-clip-sm flex h-[38px] w-[38px] items-center justify-center"
          style={{ color: '#8a97a3', border: '1px solid rgba(99,102,241,0.25)' }}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="hud-title" style={{ fontSize: 22 }}>Import User dari Excel</h1>
          <p className="mt-1 text-[13px]" style={{ color: '#8a97a3' }}>Upload satu file .xlsx berisi daftar akun siswa</p>
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
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold" style={{ color: '#b3bdc7' }}>
                Kelas untuk file ini <span style={{ color: '#6b7785', fontWeight: 400 }}>(opsional)</span>
              </label>
              <input
                name="kelas"
                type="text"
                placeholder="contoh: 12 TKJ A"
                className="hud-input w-full px-3 py-2.5 text-sm"
              />
              <p className="mt-2 text-xs" style={{ color: '#6b7785' }}>
                Diterapkan ke semua baris yang tidak punya kolom kelas. Maks 5 MB &amp; 2000 baris.
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

            <button type="submit" className="hud-btn-primary flex items-center gap-2 px-[18px] py-3 text-[12px]">
              <Upload className="h-4 w-4" />
              Upload &amp; Import
            </button>
          </form>
        </div>

        <div className="hud-panel hud-rise p-[22px]">
          <div className="mb-3 flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" style={{ color: '#5c84ff' }} />
            <h2 className="hud-label text-[11px]" style={{ color: '#c3ccd6' }}>Format File</h2>
          </div>
          <p className="mb-3.5 text-[12.5px] leading-relaxed" style={{ color: '#8a97a3' }}>
            Baris pertama = judul kolom. Kolom yang dikenali:
          </p>
          <div className="hud-clip-sm p-2.5" style={{ border: '1px solid rgba(99,102,241,0.16)' }}>
            <div className="flex flex-col gap-[6px] text-xs">
              <div className="flex items-center gap-2"><span className="px-2 py-0.5 font-mono" style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)' }}>email</span><span style={{ color: '#6b7785' }}>wajib, unik</span></div>
              <div className="flex items-center gap-2"><span className="px-2 py-0.5 font-mono" style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)' }}>password</span><span style={{ color: '#6b7785' }}>wajib (min 6), akan di-hash</span></div>
              <div className="flex items-center gap-2"><span className="px-2 py-0.5 font-mono" style={{ color: '#8a97a3', background: 'rgba(99,102,241,0.1)' }}>username</span><span style={{ color: '#6b7785' }}>opsional → jadi nama</span></div>
              <div className="flex items-center gap-2"><span className="px-2 py-0.5 font-mono" style={{ color: '#8a97a3', background: 'rgba(99,102,241,0.1)' }}>kelas</span><span style={{ color: '#6b7785' }}>opsional (atau isi di kiri)</span></div>
            </div>
          </div>
          <p className="mt-3 text-xs" style={{ color: '#6b7785' }}>
            Email yang sudah terdaftar akan <b style={{ color: '#e8edf2' }}>dilewati</b> (tidak menimpa akun lama). Semua dibuat sebagai siswa.
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
              <p className="hud-title text-[22px]" style={{ color: '#22c55e' }}>{created}</p>
              <p className="text-xs" style={{ color: '#6b7785' }}>Dibuat</p>
            </div>
            <div className="hud-clip-sm p-3 text-center" style={{ border: '1px solid rgba(234,179,8,0.2)', background: 'rgba(234,179,8,0.05)' }}>
              <p className="hud-title text-[22px]" style={{ color: '#eab308' }}>{skipped}</p>
              <p className="text-xs" style={{ color: '#6b7785' }}>Dilewati</p>
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
                    <th className="px-3 py-2" style={{ color: '#6b7785' }}>Baris</th>
                    <th className="px-3 py-2" style={{ color: '#6b7785' }}>Email</th>
                    <th className="px-3 py-2" style={{ color: '#6b7785' }}>Status</th>
                    <th className="px-3 py-2" style={{ color: '#6b7785' }}>Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {log.map((r, i) => (
                    <tr key={i} style={{ borderTop: '1px solid rgba(99,102,241,0.12)' }}>
                      <td className="px-3 py-2" style={{ color: '#8a97a3' }}>{r.row}</td>
                      <td className="px-3 py-2 font-mono" style={{ color: '#c3ccd6' }}>{r.ref}</td>
                      <td className="px-3 py-2">
                        {r.action === 'created' && <span style={{ color: '#22c55e' }}>Dibuat</span>}
                        {r.action === 'skipped' && <span style={{ color: '#eab308' }}>Dilewati</span>}
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
            <Link href="/users" className="hud-btn-primary px-[18px] py-3 text-[12px]">Lihat Daftar User</Link>
            <Link href="/users/import" className="hud-btn-ghost px-[18px] py-3 text-[12px]">Import Lagi</Link>
          </div>
        </div>
      )}
    </div>
  )
}
