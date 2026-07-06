import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { isSameOrigin } from '@/lib/csrf'
import { NextRequest, NextResponse } from 'next/server'

// Tandai catatan pengembalian sebagai sudah dibaca oleh pemiliknya.
// Idempoten: dipanggil ulang tidak mengubah timestamp baca pertama.
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
      select: { userId: true, catatanPengembalian: true, catatanDibacaAt: true },
    })
    // 404 juga untuk peminjaman milik orang lain — jangan bocorkan keberadaannya.
    if (!peminjaman || peminjaman.userId !== parseInt(session.user.id)) {
      return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })
    }
    if (!peminjaman.catatanPengembalian) {
      return NextResponse.json({ error: 'Tidak ada catatan' }, { status: 400 })
    }

    if (!peminjaman.catatanDibacaAt) {
      await prisma.peminjaman.update({
        where: { id: numId },
        data: { catatanDibacaAt: new Date() },
      })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error({ err }, '[POST /api/peminjaman/[id]/baca-catatan]')
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
