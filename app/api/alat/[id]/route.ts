import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const numId = Number(id)
  if (!Number.isInteger(numId) || numId <= 0)
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })

  const alat = await prisma.alat.findUnique({
    where: { id: numId },
    include: {
      peminjamanDetails: {
        where: { peminjaman: { status: { in: ['menunggu_verifikasi', 'dipinjam'] } } },
        select: { jumlah: true },
      },
    },
  })

  if (!alat) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const dipinjam = alat.peminjamanDetails.reduce((sum, d) => sum + d.jumlah, 0)
  return NextResponse.json({ ...alat, peminjamanDetails: undefined, stokTersedia: alat.stok - dipinjam })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const numId = Number(id)
  if (!Number.isInteger(numId) || numId <= 0)
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })

  try {
    const body = await req.json()
    const alat = await prisma.alat.update({
      where: { id: numId },
      data: {
        ...body,
        tanggalEos: body.tanggalEos ? new Date(body.tanggalEos) : null,
        tanggalEol: body.tanggalEol ? new Date(body.tanggalEol) : null,
      },
    })
    return NextResponse.json(alat)
  } catch (err) {
    console.error('[PUT /api/alat/[id]]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const numId = Number(id)
  if (!Number.isInteger(numId) || numId <= 0)
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })

  try {
    const activeBorrows = await prisma.peminjamanDetail.count({
      where: {
        alatId: numId,
        peminjaman: { status: { in: ['menunggu_verifikasi', 'dipinjam'] } },
      },
    })

    if (activeBorrows > 0) {
      return NextResponse.json({ error: 'Alat masih dipinjam, tidak bisa dihapus' }, { status: 400 })
    }

    await prisma.alat.delete({ where: { id: numId } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/alat/[id]]', err)
    return NextResponse.json({ error: 'Gagal menghapus alat' }, { status: 500 })
  }
}
