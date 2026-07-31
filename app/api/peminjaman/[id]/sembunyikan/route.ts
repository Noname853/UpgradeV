import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { isSameOrigin } from '@/lib/csrf'
import { NextRequest, NextResponse } from 'next/server'

// Siswa menyembunyikan peminjaman selesai/batal dari tampilannya sendiri.
// Data tetap utuh di database & tetap terlihat oleh admin. Hanya pemilik yang
// boleh, dan hanya untuk status dikembalikan/dibatalkan.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const numId = Number(id)
  if (!Number.isInteger(numId) || numId <= 0) {
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })
  }

  try {
    const peminjaman = await prisma.peminjaman.findUnique({
      where: { id: numId },
      select: { userId: true, status: true },
    })
    // 404 juga untuk milik orang lain — jangan bocorkan keberadaannya.
    if (!peminjaman || peminjaman.userId !== parseInt(session.user.id)) {
      return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })
    }
    if (!['dikembalikan', 'dibatalkan'].includes(peminjaman.status)) {
      return NextResponse.json(
        { error: 'Hanya peminjaman yang sudah selesai atau dibatalkan yang bisa disembunyikan' },
        { status: 400 },
      )
    }

    await prisma.peminjaman.update({
      where: { id: numId },
      data: { disembunyikanSiswa: true },
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error({ err }, '[POST /api/peminjaman/[id]/sembunyikan]')
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
