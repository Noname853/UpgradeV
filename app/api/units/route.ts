import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { NextRequest, NextResponse } from 'next/server'
import { unitCreateSchema } from '@/lib/validations'
import { isSameOrigin } from '@/lib/csrf'

const AKTIF = ['menunggu_verifikasi', 'dipinjam']

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const alatIdRaw = searchParams.get('alatId')
  const alatId = alatIdRaw ? parseInt(alatIdRaw, 10) : null
  if (alatId !== null && (!Number.isInteger(alatId) || alatId <= 0)) {
    return NextResponse.json({ error: 'alatId tidak valid' }, { status: 400 })
  }

  const units = await prisma.unit.findMany({
    where: alatId ? { alatId } : {},
    orderBy: { kode: 'asc' },
    include: {
      peminjamanDetails: {
        where: { peminjaman: { status: { in: AKTIF } } },
        select: { id: true },
      },
    },
  })

  const data = units.map((u) => ({
    id: u.id,
    kode: u.kode,
    alatId: u.alatId,
    kondisi: u.kondisi,
    catatan: u.catatan,
    status: u.kondisi === 'rusak' ? 'rusak' : u.peminjamanDetails.length > 0 ? 'dipinjam' : 'tersedia',
  }))

  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const session = await auth()
  if (!session || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const parsed = unitCreateSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })
    }

    const { kode, alatId, kondisi, catatan } = parsed.data

    const alat = await prisma.alat.findUnique({ where: { id: alatId }, select: { id: true } })
    if (!alat) return NextResponse.json({ error: 'Alat tidak ditemukan' }, { status: 404 })

    const existing = await prisma.unit.findUnique({ where: { kode } })
    if (existing) return NextResponse.json({ error: 'Kode unit sudah digunakan' }, { status: 400 })

    const unit = await prisma.unit.create({
      data: { kode, alatId, kondisi, catatan: catatan ?? null },
    })

    return NextResponse.json(unit, { status: 201 })
  } catch (err) {
    logger.error({ err }, '[POST /api/units]')
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
