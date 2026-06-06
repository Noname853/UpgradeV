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

  const peminjaman = await prisma.peminjaman.findUnique({
    where: { id: numId },
    include: {
      user: { select: { id: true, name: true, email: true, kelas: true } },
      details: {
        include: { alat: { select: { id: true, nama: true, kode: true, kategori: true } } },
      },
    },
  })

  if (!peminjaman) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isAdmin = session.user.role === 'admin'
  if (!isAdmin && peminjaman.userId !== parseInt(session.user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json(peminjaman)
}
