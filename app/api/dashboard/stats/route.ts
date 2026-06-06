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
    const [totalAlat, totalUser, peminjamanAktif, menungguVerifikasi, stokRendah, dikembalikanBulanIni, chartData] =
      await Promise.all([
        prisma.alat.count(),
        prisma.user.count({ where: { role: 'siswa' } }),
        prisma.peminjaman.count({ where: { status: 'dipinjam' } }),
        prisma.peminjaman.count({ where: { status: 'menunggu_verifikasi' } }),
        prisma.alat.count({ where: { stok: { lte: 5, gt: 0 } } }),
        prisma.peminjaman.count({
          where: { status: 'dikembalikan', tanggalKembali: { gte: startOfMonth } },
        }),
        getChartData(),
      ])

    return NextResponse.json({
      totalAlat,
      totalUser,
      peminjamanAktif,
      menungguVerifikasi,
      stokRendah,
      dikembalikanBulanIni,
      chartData,
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

async function getChartData() {
  const months = []
  const now = new Date()

  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)

    const [peminjaman, dikembalikan] = await Promise.all([
      prisma.peminjaman.count({ where: { tanggalPinjam: { gte: start, lte: end } } }),
      prisma.peminjaman.count({
        where: { status: 'dikembalikan', tanggalKembali: { gte: start, lte: end } },
      }),
    ])

    months.push({
      bulan: start.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
      peminjaman,
      dikembalikan,
    })
  }

  return months
}
