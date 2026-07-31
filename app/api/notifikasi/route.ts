import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { formatDate, bersihkanCatatanSiswa } from '@/lib/utils'
import { logger } from '@/lib/logger'

// Notifikasi siswa: catatan pengembalian & laporan kerusakan yang belum dibaca.
// Dipakai tombol lonceng di app bar (dan popup auto-login). Admin tidak punya
// notifikasi jenis ini — kembalikan daftar kosong.
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (session.user.role !== 'siswa') return NextResponse.json({ items: [] })

  const userId = parseInt(session.user.id)
  try {
    const rows = await prisma.peminjaman.findMany({
      where: {
        userId,
        status: 'dikembalikan',
        catatanDibacaAt: null,
        OR: [
          { catatanPengembalian: { not: null } },
          { details: { some: { kerusakan: { not: null } } } },
        ],
      },
      orderBy: { tanggalKembali: 'desc' },
      take: 20,
      select: {
        id: true,
        catatanPengembalian: true,
        tanggalKembali: true,
        details: {
          select: { kerusakan: true, unit: { select: { kode: true, alat: { select: { nama: true } } } } },
        },
      },
    })

    const items = rows
      .map((p) => ({
        id: p.id,
        // Buang anotasi internal admin sebelum dikirim ke siswa.
        catatan: bersihkanCatatanSiswa(p.catatanPengembalian),
        tanggalKembali: p.tanggalKembali ? formatDate(p.tanggalKembali) : null,
        alat: p.details.map((d) => `${d.unit.alat.nama} (${d.unit.kode})`).join(', '),
        kerusakan: p.details
          .filter((d) => d.kerusakan)
          .map((d) => ({ kode: d.unit.kode, catatan: d.kerusakan as string })),
      }))
      .filter((it) => it.catatan || it.kerusakan.length > 0)

    return NextResponse.json({ items })
  } catch (err) {
    logger.error({ err }, '[GET /api/notifikasi]')
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
