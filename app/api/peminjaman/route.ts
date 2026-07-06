import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { isSameOrigin } from '@/lib/csrf'
import { z } from 'zod'

const AKTIF = ['menunggu_verifikasi', 'dipinjam']

const peminjamanCreateSchema = z
  .object({
    keperluan: z.string().trim().min(1, 'Keperluan wajib diisi').max(500),
    tanggalBatasKembali: z.preprocess(
      (v) => (v === '' || v == null ? null : v),
      z.coerce.date().nullable(),
    ),
    catatan: z.preprocess((v) => (v === '' || v == null ? null : v), z.string().max(1000).nullable()),
    items: z
      .array(
        z
          .object({
            // Maks 1 unit per alat: satu item = satu jenis alat = satu unit.
            unitIds: z.array(z.coerce.number().int().positive()).min(1).max(1),
            keterangan: z.preprocess(
              (v) => (v === '' || v == null ? null : v),
              z.string().max(500).nullable(),
            ),
          })
          .strict(),
      )
      .min(1, 'Pilih minimal 1 alat')
      .max(20),
  })
  .strict()

class UnitError extends Error {}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const status = searchParams.get('status') ?? ''
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1') || 1)
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '10') || 10))
  const skip = (page - 1) * limit
  const isAdmin = session.user.role === 'admin'
  const userId = parseInt(session.user.id)

  const where = {
    ...(isAdmin ? {} : { userId }),
    ...(status ? { status } : {}),
  }

  const [peminjamans, total] = await Promise.all([
    prisma.peminjaman.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, kelas: true } },
        details: {
          include: {
            unit: {
              select: {
                id: true,
                kode: true,
                alat: { select: { id: true, nama: true, kategori: true } },
              },
            },
          },
        },
      },
    }),
    prisma.peminjaman.count({ where }),
  ])

  return NextResponse.json({ data: peminjamans, total, page, limit, pages: Math.ceil(total / limit) })
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role === 'admin') {
    return NextResponse.json({ error: 'Admin tidak dapat membuat peminjaman' }, { status: 403 })
  }

  try {
    const parsed = peminjamanCreateSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })
    }
    const { keperluan, tanggalBatasKembali, catatan, items } = parsed.data
    const userId = parseInt(session.user.id)

    if (!Number.isFinite(userId) || userId <= 0) {
      return NextResponse.json({ error: 'Sesi tidak valid, silakan login ulang' }, { status: 401 })
    }

    const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
    if (!userExists) {
      return NextResponse.json({ error: 'Akun tidak ditemukan, silakan login ulang' }, { status: 401 })
    }

    // Flatten + dedupe semua unit yang diminta.
    const allUnitIds = Array.from(new Set(items.flatMap((it) => it.unitIds)))
    if (allUnitIds.length === 0) {
      return NextResponse.json({ error: 'Pilih minimal 1 unit' }, { status: 400 })
    }

    // Map unitId -> keterangan & ke alatId (untuk validasi 1 unit cuma 1 alat).
    const unitKeteranganMap = new Map<number, string | null>()
    for (const it of items) {
      for (const uid of it.unitIds) {
        unitKeteranganMap.set(uid, it.keterangan ?? null)
      }
    }

    // Cek dan create dalam 1 transaksi — cegah race condition (2 siswa pilih unit sama).
    const peminjaman = await prisma.$transaction(async (tx) => {
      const units = await tx.unit.findMany({
        where: { id: { in: allUnitIds } },
        include: {
          alat: { select: { id: true, nama: true } },
          peminjamanDetails: {
            where: { peminjaman: { status: { in: AKTIF } } },
            select: { id: true },
          },
        },
      })

      if (units.length !== allUnitIds.length) {
        throw new UnitError('Sebagian unit tidak ditemukan')
      }

      // Maks 1 unit per jenis alat dalam satu pengajuan — dicek dari alat milik
      // unit (bukan struktur items) agar tidak bisa diakali lewat item terpisah.
      const alatTerpakai = new Set<number>()
      for (const u of units) {
        if (u.kondisi !== 'baik') {
          throw new UnitError(`Unit ${u.kode} (${u.alat.nama}) sedang rusak, tidak bisa dipinjam`)
        }
        if (u.peminjamanDetails.length > 0) {
          throw new UnitError(`Unit ${u.kode} (${u.alat.nama}) sedang dipinjam, silakan pilih unit lain`)
        }
        if (alatTerpakai.has(u.alat.id)) {
          throw new UnitError(`Maksimal 1 unit per alat — ${u.alat.nama} dipilih lebih dari 1 unit`)
        }
        alatTerpakai.add(u.alat.id)
      }

      return tx.peminjaman.create({
        data: {
          userId,
          totalItems: allUnitIds.length,
          keperluan,
          catatan: catatan ?? null,
          tanggalPinjam: new Date(),
          tanggalBatasKembali: tanggalBatasKembali ?? null,
          status: 'menunggu_verifikasi',
          details: {
            create: allUnitIds.map((uid) => ({
              unitId: uid,
              keterangan: unitKeteranganMap.get(uid) ?? null,
            })),
          },
        },
        include: {
          details: { include: { unit: { include: { alat: true } } } },
          user: { select: { id: true, name: true } },
        },
      })
    })

    return NextResponse.json(peminjaman, { status: 201 })
  } catch (err) {
    if (err instanceof UnitError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    logger.error({ err }, '[POST /api/peminjaman]')
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
