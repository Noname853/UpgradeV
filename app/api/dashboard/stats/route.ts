import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isAdmin = session.user.role === 'admin'
  const userId = parseInt(session.user.id)

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  if (isAdmin) {
    const [totalAlat, totalUser, peminjamanAktif, menungguVerifikasi, stokRendah, dikembalikanBulanIni] =
      await Promise.all([
        prisma.alat.count(),
        prisma.user.count({ where: { role: 'siswa' } }),
        prisma.peminjaman.count({ where: { status: 'dipinjam' } }),
        prisma.peminjaman.count({ where: { status: 'menunggu_verifikasi' } }),
        Promise.resolve(0), // stok rendah dihapus sementara di sistem unit
        prisma.peminjaman.count({
          where: { status: 'dikembalikan', tanggalKembali: { gte: startOfMonth } },
        }),
      ])

    return NextResponse.json({
      totalAlat,
      totalUser,
      peminjamanAktif,
      menungguVerifikasi,
      stokRendah,
      dikembalikanBulanIni,
    })
  } else {
    const [peminjamanAktif, menungguVerifikasi, totalPeminjaman] = await Promise.all([
      prisma.peminjaman.count({ where: { userId, status: 'dipinjam' } }),
      prisma.peminjaman.count({ where: { userId, status: 'menunggu_verifikasi' } }),
      prisma.peminjaman.count({ where: { userId } }),
    ])

    return NextResponse.json({ peminjamanAktif, menungguVerifikasi, totalPeminjaman })
  }
}
