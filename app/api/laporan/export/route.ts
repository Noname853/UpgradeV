import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { checkRateLimit } from '@/lib/rate-limit'
import { parseLaporanFilter, isTelat } from '@/lib/laporan'
import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'

// Batas atas baris export sebagai pengaman memori. Skala lab (ratusan
// peminjaman per semester) tidak akan menyentuh angka ini.
const MAX_ROWS = 10_000

function headerStyle(sheet: ExcelJS.Worksheet) {
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } }
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (session?.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Membangun workbook itu kerja berat; cegah spam klik/refresh beruntun.
  const allowed = await checkRateLimit(`laporan-export:${session.user.id}`, 5, 60_000)
  if (!allowed) {
    return NextResponse.json({ error: 'Terlalu sering export, tunggu sebentar' }, { status: 429 })
  }

  const sp = req.nextUrl.searchParams
  const filter = parseLaporanFilter({
    status: sp.get('status'),
    dari: sp.get('dari'),
    sampai: sp.get('sampai'),
  })

  try {
    const [peminjamans, kerusakans] = await Promise.all([
      prisma.peminjaman.findMany({
        where: filter.whereFull,
        orderBy: { createdAt: 'desc' },
        take: MAX_ROWS,
        include: {
          user: { select: { name: true, kelas: true } },
          details: {
            include: { unit: { select: { kode: true, alat: { select: { id: true, nama: true, kategori: true } } } } },
          },
        },
      }),
      prisma.peminjamanDetail.findMany({
        where: { kerusakan: { not: null }, peminjaman: filter.whereRange },
        orderBy: { updatedAt: 'desc' },
        take: MAX_ROWS,
        select: {
          kerusakan: true,
          unit: { select: { kode: true, alat: { select: { nama: true } } } },
          peminjaman: { select: { tanggalKembali: true, user: { select: { name: true, kelas: true } } } },
        },
      }),
    ])

    const now = new Date()
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Inventaris TKJ'

    // ── Sheet 1: Peminjaman ────────────────────────────────────────────
    const sPinjam = workbook.addWorksheet('Peminjaman')
    sPinjam.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Peminjam', key: 'peminjam', width: 24 },
      { header: 'Kelas', key: 'kelas', width: 12 },
      { header: 'Alat (Unit)', key: 'alat', width: 48 },
      { header: 'Jumlah Unit', key: 'jumlah', width: 12 },
      { header: 'Keperluan', key: 'keperluan', width: 32 },
      { header: 'Tanggal Pinjam', key: 'pinjam', width: 16 },
      { header: 'Batas Kembali', key: 'batas', width: 16 },
      { header: 'Tanggal Kembali', key: 'kembali', width: 16 },
      { header: 'Status', key: 'status', width: 20 },
      { header: 'Telat', key: 'telat', width: 8 },
    ]
    headerStyle(sPinjam)
    for (const p of peminjamans) {
      sPinjam.addRow({
        id: p.id,
        peminjam: p.user.name,
        kelas: p.user.kelas ?? '',
        alat: p.details.map((d) => `${d.unit.alat.nama} (${d.unit.kode})`).join(', '),
        jumlah: p.details.length,
        keperluan: p.keperluan,
        pinjam: p.tanggalPinjam,
        batas: p.tanggalBatasKembali ?? '',
        kembali: p.tanggalKembali ?? '',
        status: p.status,
        telat: isTelat(p, now) ? 'Ya' : '',
      })
    }

    // ── Sheet 2: Rekap Alat ────────────────────────────────────────────
    const alatCount = new Map<number, { nama: string; kategori: string; jumlah: number }>()
    for (const p of peminjamans) {
      for (const d of p.details) {
        const a = d.unit.alat
        const entry = alatCount.get(a.id)
        if (entry) entry.jumlah++
        else alatCount.set(a.id, { nama: a.nama, kategori: a.kategori, jumlah: 1 })
      }
    }
    const sRekap = workbook.addWorksheet('Rekap Alat')
    sRekap.columns = [
      { header: 'Alat', key: 'nama', width: 36 },
      { header: 'Kategori', key: 'kategori', width: 20 },
      { header: 'Total Unit Dipinjam', key: 'jumlah', width: 20 },
    ]
    headerStyle(sRekap)
    for (const a of [...alatCount.values()].sort((x, y) => y.jumlah - x.jumlah)) {
      sRekap.addRow(a)
    }

    // ── Sheet 3: Kerusakan ─────────────────────────────────────────────
    const sRusak = workbook.addWorksheet('Kerusakan')
    sRusak.columns = [
      { header: 'Tanggal Kembali', key: 'tanggal', width: 16 },
      { header: 'Alat', key: 'alat', width: 32 },
      { header: 'Kode Unit', key: 'kode', width: 16 },
      { header: 'Peminjam', key: 'peminjam', width: 24 },
      { header: 'Kelas', key: 'kelas', width: 12 },
      { header: 'Kerusakan', key: 'kerusakan', width: 48 },
    ]
    headerStyle(sRusak)
    for (const k of kerusakans) {
      sRusak.addRow({
        tanggal: k.peminjaman.tanggalKembali ?? '',
        alat: k.unit.alat.nama,
        kode: k.unit.kode,
        peminjam: k.peminjaman.user.name,
        kelas: k.peminjaman.user.kelas ?? '',
        kerusakan: k.kerusakan,
      })
    }

    const buffer = await workbook.xlsx.writeBuffer()

    // Nama file hanya dari nilai yang sudah tervalidasi (bukan query mentah)
    // agar tidak ada karakter liar yang masuk ke header Content-Disposition.
    const fmt = (d: Date) => d.toISOString().slice(0, 10)
    const rentang =
      filter.dari || filter.sampai
        ? `_${filter.dari ? fmt(filter.dari) : 'awal'}_sd_${filter.sampai ? fmt(filter.sampai) : 'sekarang'}`
        : ''
    const filename = `laporan-peminjaman${rentang}_${fmt(now)}.xlsx`

    return new NextResponse(buffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    logger.error({ err }, '[GET /api/laporan/export]')
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
