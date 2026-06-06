import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const numId = Number(id)
  if (!Number.isInteger(numId) || numId <= 0)
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })

  try {
    const peminjaman = await prisma.peminjaman.findUnique({ where: { id: numId } })

    if (!peminjaman) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (peminjaman.status !== 'menunggu_verifikasi')
      return NextResponse.json({ error: 'Status tidak valid untuk verifikasi' }, { status: 400 })

    const updated = await prisma.peminjaman.update({
      where: { id: numId },
      data: {
        status: 'dipinjam',
        tanggalVerifikasi: new Date(),
        verifiedBy: parseInt(session.user.id),
      },
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('[PATCH /api/peminjaman/[id]/verify]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
