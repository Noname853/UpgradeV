import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

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
  const session = await auth()
  if (!session || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await req.json()
    const { kode, nama, kategori, stok, lokasi, deskripsi, foto, tanggalEos, tanggalEol, keteranganEos, keteranganEol } = body

    if (!kode || !nama || !kategori) {
      return NextResponse.json({ error: 'Kode, nama, dan kategori wajib diisi' }, { status: 400 })
    }

    const existing = await prisma.alat.findUnique({ where: { kode } })
    if (existing) return NextResponse.json({ error: 'Kode alat sudah digunakan' }, { status: 400 })

    const alat = await prisma.alat.create({
      data: {
        kode,
        nama,
        kategori,
        stok: stok ?? 0,
        lokasi: lokasi ?? '',
        deskripsi: deskripsi ?? null,
        foto: foto ?? null,
        tanggalEos: tanggalEos ? new Date(tanggalEos) : null,
        tanggalEol: tanggalEol ? new Date(tanggalEol) : null,
        keteranganEos: keteranganEos ?? null,
        keteranganEol: keteranganEol ?? null,
      },
    })

    return NextResponse.json(alat, { status: 201 })
  } catch (err) {
    console.error('[POST /api/alat]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
