import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const numId = Number(id)
  if (!Number.isInteger(numId) || numId <= 0)
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })

  const body = await req.json().catch(() => ({}))

  try {
    const peminjaman = await prisma.peminjaman.findUnique({ where: { id: numId } })

    if (!peminjaman) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const isAdmin = session.user.role === 'admin'
    const isOwner = peminjaman.userId === parseInt(session.user.id)

    if (!isAdmin && !isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (!['menunggu_verifikasi', 'dipinjam'].includes(peminjaman.status))
      return NextResponse.json({ error: 'Status tidak dapat dibatalkan' }, { status: 400 })

    const updated = await prisma.peminjaman.update({
      where: { id: numId },
      data: {
        status: 'dibatalkan',
        tanggalBatal: new Date(),
        cancelledBy: parseInt(session.user.id),
        alasanPembatalan: body.alasan ?? null,
      },
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('[PATCH /api/peminjaman/[id]/cancel]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
