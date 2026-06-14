import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ActivityChart } from '@/components/dashboard/ActivityChart'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDate } from '@/lib/utils'
import { Clock } from 'lucide-react'
import Link from 'next/link'

async function getChartData() {
  const now = new Date()

  // Susun dulu rentang 6 bulan, lalu jalankan SEMUA query sekaligus dalam satu
  // Promise.all. Sebelumnya tiap bulan menunggu (await) di dalam loop, jadi 6
  // round-trip berurutan ke database. Sekarang 12 count berjalan paralel.
  const ranges = Array.from({ length: 6 }, (_, idx) => {
    const i = 5 - idx
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
    return { start, end }
  })

  const counts = await Promise.all(
    ranges.flatMap(({ start, end }) => [
      prisma.peminjaman.count({ where: { tanggalPinjam: { gte: start, lte: end } } }),
      prisma.peminjaman.count({ where: { status: 'dikembalikan', tanggalKembali: { gte: start, lte: end } } }),
    ]),
  )

  return ranges.map(({ start }, idx) => ({
    bulan: start.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
    peminjaman: counts[idx * 2],
    dikembalikan: counts[idx * 2 + 1],
  }))
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

    const stats = [
      { title: 'Total Alat', value: totalAlat, color: '#3b82f6' },
      { title: 'Total Siswa', value: totalUser, color: '#a855f7' },
      { title: 'Dipinjam', value: peminjamanAktif, color: '#22c55e' },
      { title: 'Menunggu', value: menungguVerifikasi, color: '#eab308', desc: 'Butuh verifikasi' },
      { title: 'Stok Rendah', value: stokRendah, color: '#ef4444', desc: '≤ 5 unit' },
      { title: 'Kembali Bulan Ini', value: dikembalikanBulanIni, color: '#22c55e' },
    ]

    return (
      <div className="mx-auto max-w-[1120px]">
        <div className="mb-6 hud-rise">
          <h1 className="hud-title" style={{ fontSize: 26 }}>Dashboard</h1>
          <p className="mt-1.5 text-[15px]" style={{ color: '#8a97a3' }}>
            Selamat datang, {session?.user.name}
          </p>
        </div>

        {/* stat grid */}
        <div
          className="mb-[22px] grid gap-[13px]"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))' }}
        >
          {stats.map((s) => (
            <div
              key={s.title}
              className="hud-panel hud-accent-top hud-rise p-[18px]"
              style={{
                background: `linear-gradient(160deg, ${s.color}12, rgba(255,255,255,0.012))`,
                border: `1px solid ${s.color}38`,
                ['--hud-blue2' as string]: s.color,
              }}
            >
              <p className="text-[13px] font-semibold" style={{ color: '#8a97a3' }}>{s.title}</p>
              <p className="hud-title mt-1.5 text-[30px]" style={{ color: '#fff' }}>{s.value}</p>
              {s.desc && <p className="mt-1 text-[11px]" style={{ color: '#6b7785' }}>{s.desc}</p>}
              <span
                className="hud-diamond absolute"
                style={{ right: 14, top: 14, width: 12, height: 12, background: s.color, boxShadow: `0 0 12px ${s.color}99` }}
              />
            </div>
          ))}
        </div>

        {/* chart + recent */}
        <div
          className="mb-[18px] grid gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))' }}
        >
          <div className="hud-panel p-5">
            <h2 className="hud-label mb-4 text-[12px]" style={{ color: '#c3ccd6' }}>
              Aktivitas 6 Bulan Terakhir
            </h2>
            <ActivityChart data={chartData} />
          </div>

          <div className="hud-panel p-5">
            <div className="mb-3.5 flex items-center justify-between">
              <h2 className="hud-label text-[12px]" style={{ color: '#c3ccd6' }}>
                Peminjaman Terbaru
              </h2>
              <Link href="/peminjaman" className="text-[12px] font-semibold" style={{ color: '#5c84ff' }}>
                Lihat semua →
              </Link>
            </div>
            <div className="flex flex-col gap-1">
              {recentPeminjaman.map((p) => (
                <Link
                  key={p.id}
                  href={`/peminjaman/${p.id}`}
                  className="flex items-center justify-between gap-2.5 px-2.5 py-2 transition"
                  style={{ borderLeft: '2px solid rgba(99,102,241,0.2)' }}
                >
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold" style={{ color: '#e8edf2' }}>{p.user.name}</p>
                    <p className="truncate text-[12px]" style={{ color: '#6b7785' }}>
                      {p.details[0]?.alat.nama ?? '-'} · {formatDate(p.tanggalPinjam)}
                    </p>
                  </div>
                  <StatusBadge status={p.status} />
                </Link>
              ))}
              {recentPeminjaman.length === 0 && (
                <p className="py-4 text-center text-sm" style={{ color: '#6b7785' }}>Belum ada peminjaman</p>
              )}
            </div>
          </div>
        </div>

        {/* verify alert */}
        {menungguVerifikasi > 0 && (
          <div
            className="hud-panel flex flex-wrap items-center justify-between gap-3.5 p-[18px]"
            style={{
              background: 'linear-gradient(160deg, rgba(234,179,8,0.09), rgba(255,255,255,0.01))',
              border: '1px solid rgba(234,179,8,0.28)',
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="hud-hex-wide flex h-[38px] w-[38px] items-center justify-center"
                style={{ background: 'rgba(234,179,8,0.14)' }}
              >
                <Clock className="h-4 w-4" style={{ color: '#eab308' }} />
              </div>
              <div>
                <p className="text-[14.5px] font-semibold" style={{ color: '#fff' }}>
                  {menungguVerifikasi} peminjaman menunggu verifikasi
                </p>
                <p className="mt-0.5 text-[12.5px]" style={{ color: '#8a97a3' }}>
                  Segera proses agar siswa bisa meminjam
                </p>
              </div>
            </div>
            <Link
              href="/peminjaman?status=menunggu_verifikasi"
              className="hud-clip-sm px-4 py-2.5 text-[12px]"
              style={{
                fontFamily: 'var(--font-orbitron), sans-serif',
                fontWeight: 700,
                letterSpacing: 1,
                color: '#eab308',
                background: 'rgba(234,179,8,0.12)',
                border: '1px solid rgba(234,179,8,0.3)',
              }}
            >
              PROSES
            </Link>
          </div>
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

  const siswaStats = [
    { title: 'Sedang Dipinjam', value: peminjamanAktif.length, color: '#3b82f6' },
    { title: 'Menunggu Verifikasi', value: menungguVerifikasi, color: '#eab308' },
    { title: 'Total Peminjaman', value: riwayat.length, color: '#22c55e' },
  ]

  return (
    <div className="mx-auto max-w-[1120px]">
      <div className="mb-6 hud-rise">
        <h1 className="hud-title" style={{ fontSize: 26 }}>Dashboard</h1>
        <p className="mt-1.5 text-[15px]" style={{ color: '#8a97a3' }}>
          Halo, {session?.user.name}
        </p>
      </div>

      {/* stat grid */}
      <div
        className="mb-[22px] grid gap-[13px]"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}
      >
        {siswaStats.map((s) => (
          <div
            key={s.title}
            className="hud-panel hud-accent-top hud-rise p-5"
            style={{
              background: `linear-gradient(160deg, ${s.color}12, rgba(255,255,255,0.012))`,
              border: `1px solid ${s.color}38`,
              ['--hud-blue2' as string]: s.color,
            }}
          >
            <p className="text-[13px] font-semibold" style={{ color: '#8a97a3' }}>{s.title}</p>
            <p className="hud-title mt-1.5 text-[32px]" style={{ color: '#fff' }}>{s.value}</p>
            <span
              className="hud-diamond absolute"
              style={{ right: 14, top: 14, width: 12, height: 12, background: s.color, boxShadow: `0 0 12px ${s.color}99` }}
            />
          </div>
        ))}
      </div>

      {/* quick actions */}
      <div className="mb-[22px] flex flex-wrap gap-2.5">
        <Link
          href="/peminjaman/baru"
          className="hud-btn-primary inline-flex items-center gap-2 px-[22px] py-3 text-[12px]"
        >
          + BUAT PEMINJAMAN
        </Link>
        <Link
          href="/alat"
          className="hud-btn-ghost inline-flex items-center gap-2 px-[22px] py-3 text-[12px]"
        >
          LIHAT ALAT
        </Link>
      </div>

      {/* active loans */}
      {peminjamanAktif.length > 0 && (
        <div className="hud-panel hud-rise mb-4 p-5">
          <h2 className="hud-label mb-3.5 text-[12px]" style={{ color: '#c3ccd6' }}>
            Peminjaman Aktif Saya
          </h2>
          <div className="flex flex-col gap-1">
            {peminjamanAktif.map((p) => (
              <Link
                key={p.id}
                href={`/peminjaman/${p.id}`}
                className="flex items-center justify-between gap-2.5 px-3 py-2.5 transition"
                style={{ borderLeft: '2px solid rgba(99,102,241,0.2)' }}
              >
                <div className="min-w-0">
                  <p className="truncate text-[14.5px] font-semibold" style={{ color: '#e8edf2' }}>
                    {p.details.map((d) => d.alat.nama).join(', ')}
                  </p>
                  <p className="mt-0.5 text-[12px]" style={{ color: '#6b7785' }}>
                    {formatDate(p.tanggalPinjam)}
                  </p>
                </div>
                <StatusBadge status={p.status} />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* history */}
      <div className="hud-panel hud-rise p-5">
        <div className="mb-3.5 flex items-center justify-between">
          <h2 className="hud-label text-[12px]" style={{ color: '#c3ccd6' }}>Riwayat Peminjaman</h2>
          <Link href="/peminjaman" className="text-[12px] font-semibold" style={{ color: '#5c84ff' }}>
            Lihat semua →
          </Link>
        </div>
        <div className="flex flex-col">
          {riwayat.map((p) => (
            <Link
              key={p.id}
              href={`/peminjaman/${p.id}`}
              className="flex items-center justify-between gap-2.5 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-[14px]" style={{ color: '#e8edf2' }}>
                  {p.details[0]?.alat.nama ?? '-'}
                </p>
                <p className="mt-0.5 text-[12px]" style={{ color: '#6b7785' }}>
                  {formatDate(p.tanggalPinjam)}
                </p>
              </div>
              <StatusBadge status={p.status} />
            </Link>
          ))}
          {riwayat.length === 0 && (
            <p className="py-4 text-center text-sm" style={{ color: '#6b7785' }}>Belum ada riwayat peminjaman</p>
          )}
        </div>
      </div>
    </div>
  )
}
