import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { checkRateLimit } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const AKTIF = ['menunggu_verifikasi', 'dipinjam']

// Sama dengan /api/units/lookup: kode dari QR = input tak tepercaya.
const kodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9 _\-.()/]+$/)

// Scan global pengembalian: dari kode unit, temukan peminjaman aktif yang
// memuatnya — admin scan barang apa pun dari tumpukan, sistem menunjuk
// pengembalian mana yang harus diproses.
export async function GET(req: NextRequest) {
  const session = await auth()
  // Memetakan unit -> peminjam adalah data pemantauan; khusus admin.
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const allowed = await checkRateLimit(`peminjaman-lookup:${session.user.id}`, 30, 10_000)
  if (!allowed) {
    return NextResponse.json({ error: 'Terlalu banyak scan, tunggu sebentar' }, { status: 429 })
  }

  const parsed = kodeSchema.safeParse(req.nextUrl.searchParams.get('kode'))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Kode tidak valid' }, { status: 400 })
  }
  const kode = parsed.data

  try {
    // Cocokkan persis dulu, lalu fallback case-insensitive (kode campur
    // besar-kecil; sebagian alat scan memaksa huruf besar).
    let unitId: number | null = null
    const exact = await prisma.unit.findUnique({ where: { kode }, select: { id: true } })
    if (exact) {
      unitId = exact.id
    } else {
      const all = await prisma.unit.findMany({ select: { id: true, kode: true } })
      const lower = kode.toLowerCase()
      const matches = all.filter((u) => u.kode.toLowerCase() === lower)
      if (matches.length === 1) unitId = matches[0].id
    }
    if (unitId === null) {
      return NextResponse.json({ error: 'Unit tidak ditemukan' }, { status: 404 })
    }

    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
      select: { id: true, kode: true, alat: { select: { nama: true } } },
    })
    if (!unit) return NextResponse.json({ error: 'Unit tidak ditemukan' }, { status: 404 })

    const detail = await prisma.peminjamanDetail.findFirst({
      where: { unitId, peminjaman: { status: { in: AKTIF } } },
      select: {
        peminjaman: {
          select: {
            id: true,
            status: true,
            tanggalBatasKembali: true,
            user: { select: { name: true, kelas: true } },
            _count: { select: { details: true } },
          },
        },
      },
    })

    return NextResponse.json({
      data: {
        unit: { id: unit.id, kode: unit.kode, alatNama: unit.alat.nama },
        // null = unit dikenal tapi tidak sedang dipinjam siapa pun.
        peminjaman: detail
          ? {
              id: detail.peminjaman.id,
              status: detail.peminjaman.status,
              tanggalBatasKembali: detail.peminjaman.tanggalBatasKembali,
              peminjam: detail.peminjaman.user.name,
              kelas: detail.peminjaman.user.kelas,
              totalUnit: detail.peminjaman._count.details,
            }
          : null,
      },
    })
  } catch (err) {
    logger.error({ err }, '[GET /api/peminjaman/lookup-unit]')
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
