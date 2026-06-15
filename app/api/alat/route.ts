import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { NextRequest, NextResponse } from 'next/server'
import { alatCreateSchema } from '@/lib/validations'
import { isSameOrigin } from '@/lib/csrf'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const search = searchParams.get('search') ?? ''
  const kategori = searchParams.get('kategori') ?? ''
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1') || 1)
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '12') || 12))
  const skip = (page - 1) * limit

  const where = {
    AND: [
      search ? { OR: [{ nama: { contains: search } }, { kode: { contains: search } }] } : {},
      kategori ? { kategori } : {},
    ],
  }

  const [alats, total] = await Promise.all([
    prisma.alat.findMany({
      where,
      skip,
      take: limit,
      orderBy: { nama: 'asc' },
      include: {
        peminjamanDetails: {
          where: { peminjaman: { status: { in: ['menunggu_verifikasi', 'dipinjam'] } } },
          select: { jumlah: true },
        },
      },
    }),
    prisma.alat.count({ where }),
  ])

  const data = alats.map((a) => {
    const dipinjam = a.peminjamanDetails.reduce((sum, d) => sum + d.jumlah, 0)
    return {
      ...a,
      peminjamanDetails: undefined,
      stokTersedia: a.stok - dipinjam,
    }
  })

  return NextResponse.json({ data, total, page, limit, pages: Math.ceil(total / limit) })
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const session = await auth()
  if (!session || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const parsed = alatCreateSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })
    }
    const { kode, lokasi, ...rest } = parsed.data

    const existing = await prisma.alat.findUnique({ where: { kode } })
    if (existing) return NextResponse.json({ error: 'Kode alat sudah digunakan' }, { status: 400 })

    const alat = await prisma.alat.create({
      data: {
        kode,
        lokasi: lokasi ?? '',
        ...rest,
      },
    })

    return NextResponse.json(alat, { status: 201 })
  } catch (err) {
    logger.error({ err }, '[POST /api/alat]')
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
