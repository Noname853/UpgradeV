import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StatCard } from '@/components/dashboard/StatCard'
import { ActivityChart } from '@/components/dashboard/ActivityChart'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { GlassCard } from '@/components/shared/GlassCard'
import { formatDate } from '@/lib/utils'
import { Wrench, Users, PackageCheck, Clock, AlertTriangle, CheckCircle } from 'lucide-react'
import Link from 'next/link'

async function getChartData() {
  const months = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
    const [peminjaman, dikembalikan] = await Promise.all([
      prisma.peminjaman.count({ where: { tanggalPinjam: { gte: start, lte: end } } }),
      prisma.peminjaman.count({ where: { status: 'dikembalikan', tanggalKembali: { gte: start, lte: end } } }),
    ])
    months.push({
      bulan: start.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
      peminjaman,
      dikembalikan,
    })
  }
  return months
}

export default async function DashboardPage() {
  const session = await auth()
  const isAdmin = session?.user.role === 'admin'
  const userId = parseInt(session?.user.id ?? '0')

  if (isAdmin) {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [totalAlat, totalUser, peminjamanAktif, menungguVerifikasi, stokRendah, dikembalikanBulanIni, recentPeminjaman, chartData] =
      await Promise.all([
        prisma.alat.count(),
        prisma.user.count({ where: { role: 'siswa' } }),
        prisma.peminjaman.count({ where: { status: 'dipinjam' } }),
        prisma.peminjaman.count({ where: { status: 'menunggu_verifikasi' } }),
        prisma.alat.count({ where: { stok: { lte: 5, gt: 0 } } }),
        prisma.peminjaman.count({ where: { status: 'dikembalikan', tanggalKembali: { gte: startOfMonth } } }),
        prisma.peminjaman.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { name: true } }, details: { include: { alat: { select: { nama: true } } } } },
        }),
        getChartData(),
      ])

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-neutral-400">Selamat datang, {session?.user.name}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard title="Total Alat" value={totalAlat} icon={Wrench} color="blue" />
          <StatCard title="Total Siswa" value={totalUser} icon={Users} color="purple" />
          <StatCard title="Dipinjam" value={peminjamanAktif} icon={PackageCheck} color="green" />
          <StatCard title="Menunggu" value={menungguVerifikasi} icon={Clock} color="yellow" description="Butuh verifikasi" />
          <StatCard title="Stok Rendah" value={stokRendah} icon={AlertTriangle} color="red" description="≤ 5 unit" />
          <StatCard title="Kembali Bulan Ini" value={dikembalikanBulanIni} icon={CheckCircle} color="green" />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <GlassCard className="p-5">
            <h2 className="mb-4 text-sm font-semibold text-neutral-300">Aktivitas 1 Bulan Terakhir</h2>
            <ActivityChart data={chartData} />
          </GlassCard>

          <GlassCard className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-300">Peminjaman Terbaru</h2>
              <Link href="/peminjaman" className="text-xs text-blue-400 hover:text-blue-300">
                Lihat semua →
              </Link>
            </div>
            <div className="space-y-3">
              {recentPeminjaman.map((p) => (
                <Link
                  key={p.id}
                  href={`/peminjaman/${p.id}`}
                  className="flex items-center justify-between rounded-lg p-2 transition hover:bg-white/[0.03]"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{p.user.name}</p>
                    <p className="text-xs text-neutral-500">{p.details[0]?.alat.nama ?? '-'} · {formatDate(p.tanggalPinjam)}</p>
                  </div>
                  <StatusBadge status={p.status} />
                </Link>
              ))}
              {recentPeminjaman.length === 0 && (
                <p className="text-center text-sm text-neutral-600 py-4">Belum ada peminjaman</p>
              )}
            </div>
          </GlassCard>
        </div>

        {menungguVerifikasi > 0 && (
          <GlassCard className="border-yellow-500/20 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-yellow-500/10 p-2">
                  <Clock className="h-4 w-4 text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    {menungguVerifikasi} peminjaman menunggu verifikasi
                  </p>
                  <p className="text-xs text-neutral-500">Segera proses agar siswa bisa meminjam</p>
                </div>
              </div>
              <Link
                href="/peminjaman?status=menunggu_verifikasi"
                className="rounded-lg bg-yellow-500/10 px-3 py-1.5 text-sm text-yellow-400 transition hover:bg-yellow-500/20"
              >
                Proses
              </Link>
            </div>
          </GlassCard>
        )}
      </div>
    )
  }

  // Siswa dashboard
  const [peminjamanAktif, menungguVerifikasi, riwayat] = await Promise.all([
    prisma.peminjaman.findMany({
      where: { userId, status: 'dipinjam' },
      take: 3,
      include: { details: { include: { alat: { select: { nama: true } } } } },
    }),
    prisma.peminjaman.count({ where: { userId, status: 'menunggu_verifikasi' } }),
    prisma.peminjaman.findMany({
      where: { userId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { details: { include: { alat: { select: { nama: true } } } } },
    }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-neutral-400">Halo, {session?.user.name}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="Sedang Dipinjam" value={peminjamanAktif.length} icon={PackageCheck} color="blue" />
        <StatCard title="Menunggu Verifikasi" value={menungguVerifikasi} icon={Clock} color="yellow" />
        <StatCard title="Total Peminjaman" value={riwayat.length} icon={CheckCircle} color="green" />
      </div>

      <div className="flex gap-3">
        <Link
          href="/peminjaman/baru"
          className="rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:from-blue-500 hover:to-purple-500"
        >
          Buat Peminjaman
        </Link>
        <Link
          href="/alat"
          className="rounded-lg border border-neutral-700 px-4 py-2.5 text-sm text-neutral-300 transition hover:border-neutral-600 hover:text-white"
        >
          Lihat Alat
        </Link>
      </div>

      {peminjamanAktif.length > 0 && (
        <GlassCard className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-neutral-300">Peminjaman Aktif Saya</h2>
          <div className="space-y-3">
            {peminjamanAktif.map((p) => (
              <Link
                key={p.id}
                href={`/peminjaman/${p.id}`}
                className="flex items-center justify-between rounded-lg p-2 transition hover:bg-white/[0.03]"
              >
                <div>
                  <p className="text-sm font-medium text-white">
                    {p.details.map((d) => d.alat.nama).join(', ')}
                  </p>
                  <p className="text-xs text-neutral-500">{formatDate(p.tanggalPinjam)}</p>
                </div>
                <StatusBadge status={p.status} />
              </Link>
            ))}
          </div>
        </GlassCard>
      )}

      <GlassCard className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-300">Riwayat Peminjaman</h2>
          <Link href="/peminjaman" className="text-xs text-blue-400">Lihat semua →</Link>
        </div>
        <div className="space-y-2">
          {riwayat.map((p) => (
            <Link
              key={p.id}
              href={`/peminjaman/${p.id}`}
              className="flex items-center justify-between rounded-lg p-2 transition hover:bg-white/[0.03]"
            >
              <div>
                <p className="text-sm text-white">{p.details[0]?.alat.nama ?? '-'}</p>
                <p className="text-xs text-neutral-500">{formatDate(p.tanggalPinjam)}</p>
              </div>
              <StatusBadge status={p.status} />
            </Link>
          ))}
          {riwayat.length === 0 && (
            <p className="text-center text-sm text-neutral-600 py-4">Belum ada riwayat peminjaman</p>
          )}
        </div>
      </GlassCard>
    </div>
  )
}
