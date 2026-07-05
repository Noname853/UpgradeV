import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { checkRateLimit } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const AKTIF = ['menunggu_verifikasi', 'dipinjam']

// Kode berasal dari QR/alat scan = input tak tepercaya sepenuhnya.
// Batasi panjang dan karakter ke pola kode inventaris (huruf, angka,
// spasi, _ - . / ( )) sebelum menyentuh query apa pun.
const kodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9 _\-.()/]+$/)

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Scan beruntun itu wajar, tapi enumerasi kode secara massal tidak.
  // 30 lookup / 10 detik per user cukup longgar untuk pemakaian normal.
  const allowed = await checkRateLimit(`unit-lookup:${session.user.id}`, 30, 10_000)
  if (!allowed) {
    return NextResponse.json({ error: 'Terlalu banyak scan, tunggu sebentar' }, { status: 429 })
  }

  const parsed = kodeSchema.safeParse(req.nextUrl.searchParams.get('kode'))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Kode tidak valid' }, { status: 400 })
  }
  const kode = parsed.data

  try {
    // Cocokkan persis dulu (jalur umum), lalu fallback case-insensitive
    // karena kode di lapangan campur besar-kecil (RB_1, Ap-1) dan sebagian
    // alat scan memaksa huruf besar.
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
      include: {
        alat: { select: { id: true, nama: true, kategori: true } },
        peminjamanDetails: {
          where: { peminjaman: { status: { in: AKTIF } } },
          select: { id: true },
        },
      },
    })
    if (!unit) {
      return NextResponse.json({ error: 'Unit tidak ditemukan' }, { status: 404 })
    }

    // Ringkasan stok alat terkait, agar UI scan bisa menampilkan kartu alat
    // dengan format yang sama seperti hasil pencarian manual.
    const siblings = await prisma.unit.findMany({
      where: { alatId: unit.alatId },
      select: {
        kondisi: true,
        peminjamanDetails: {
          where: { peminjaman: { status: { in: AKTIF } } },
          select: { id: true },
        },
      },
    })
    const rusak = siblings.filter((u) => u.kondisi === 'rusak').length
    const dipinjam = siblings.filter((u) => u.kondisi !== 'rusak' && u.peminjamanDetails.length > 0).length
    const totalUnit = siblings.length

    const status =
      unit.kondisi === 'rusak' ? 'rusak' : unit.peminjamanDetails.length > 0 ? 'dipinjam' : 'tersedia'

    return NextResponse.json({
      data: {
        id: unit.id,
        kode: unit.kode,
        kondisi: unit.kondisi,
        status,
        alat: {
          id: unit.alat.id,
          nama: unit.alat.nama,
          kategori: unit.alat.kategori,
          totalUnit,
          tersedia: totalUnit - rusak - dipinjam,
          dipinjam,
          rusak,
        },
      },
    })
  } catch (err) {
    logger.error({ err }, '[GET /api/units/lookup]')
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
