import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { checkRateLimit } from '@/lib/rate-limit'

// Status ringkas peminjaman milik siswa yang login — dipakai untuk polling
// real-time di halaman "Peminjaman Saya". Sengaja hanya mengembalikan
// { id, status } (data minimum) dan hanya milik user sendiri (userId dari sesi,
// bukan dari input → anti-IDOR). Read-only, jadi tidak perlu proteksi CSRF.
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Admin tidak memakai polling ini.
  if (session.user.role !== 'siswa') return NextResponse.json({ items: [] })

  // Batasi frekuensi: maks 20 permintaan / menit / user. Polling normal ~6/menit,
  // jadi ini longgar untuk pemakaian wajar tapi menahan klien/skrip yang membanjiri.
  const allowed = await checkRateLimit(`pinjam-status:${session.user.id}`, 20, 60_000)
  if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const userId = parseInt(session.user.id)
  try {
    const rows = await prisma.peminjaman.findMany({
      where: { userId, disembunyikanSiswa: false },
      select: { id: true, status: true },
      orderBy: { id: 'desc' },
      take: 200,
    })
    return NextResponse.json(
      { items: rows },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (err) {
    logger.error({ err }, '[GET /api/peminjaman/status]')
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
