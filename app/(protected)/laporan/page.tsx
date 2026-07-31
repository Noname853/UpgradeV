import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDate } from '@/lib/utils'
import { parseLaporanFilter, isTelat } from '@/lib/laporan'
import { FileBarChart2, Download, TrendingUp, Wrench } from 'lucide-react'
import Link from 'next/link'

interface SearchParams {
  status?: string
  dari?: string
  sampai?: string
  page?: string
}

const PER_HALAMAN = 20

export default async function LaporanPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await auth()
  if (session?.user.role !== 'admin') redirect('/dashboard')

  const sp = await searchParams
  const filter = parseLaporanFilter(sp)
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)

  const [byStatus, total, peminjamans, telatKandidat, detailAlat, kerusakans, totalKerusakan] =
    await Promise.all([
      // Statistik dihitung di database — bukan dari baris tabel yang dipotong
      // pagination — supaya angkanya tetap benar berapa pun jumlah data.
      prisma.peminjaman.groupBy({ by: ['status'], where: filter.whereRange, _count: { _all: true } }),
      prisma.peminjaman.count({ where: filter.whereFull }),
      prisma.peminjaman.findMany({
        where: filter.whereFull,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * PER_HALAMAN,
        take: PER_HALAMAN,
        include: {
          user: { select: { name: true, kelas: true } },
          details: {
            include: { unit: { select: { kode: true, alat: { select: { nama: true } } } } },
          },
        },
      }),
      // Prisma tidak bisa membandingkan dua kolom (kembali vs batas), jadi
      // kandidat telat diambil ramping lalu dihitung di JS. Skala data lab
      // (ratusan–ribuan baris) masih ringan.
      prisma.peminjaman.findMany({
        where: {
          ...filter.whereRange,
          tanggalBatasKembali: { not: null },
          status: { in: ['dipinjam', 'dikembalikan'] },
        },
        select: { status: true, tanggalBatasKembali: true, tanggalKembali: true },
      }),
      prisma.peminjamanDetail.findMany({
        where: { peminjaman: filter.whereFull },
        select: { unit: { select: { alat: { select: { id: true, nama: true, kategori: true } } } } },
      }),
      prisma.peminjamanDetail.findMany({
        where: { kerusakan: { not: null }, peminjaman: filter.whereRange },
        orderBy: { updatedAt: 'desc' },
        take: 8,
        select: {
          id: true,
          kerusakan: true,
          unit: { select: { kode: true, alat: { select: { nama: true } } } },
          peminjaman: { select: { tanggalKembali: true, user: { select: { name: true, kelas: true } } } },
        },
      }),
      prisma.peminjamanDetail.count({ where: { kerusakan: { not: null }, peminjaman: filter.whereRange } }),
    ])

  const countStatus = (s: string) => byStatus.find((b) => b.status === s)?._count._all ?? 0
  const now = new Date()
  const stats = {
    total: byStatus.reduce((sum, b) => sum + b._count._all, 0),
    menunggu: countStatus('menunggu_verifikasi'),
    dipinjam: countStatus('dipinjam'),
    dikembalikan: countStatus('dikembalikan'),
    dibatalkan: countStatus('dibatalkan'),
    telat: telatKandidat.filter((p) => isTelat(p, now)).length,
  }

  // Rekap alat paling sering dipinjam (dihitung per unit yang dipinjam).
  const alatCount = new Map<number, { nama: string; kategori: string; jumlah: number }>()
  for (const d of detailAlat) {
    const a = d.unit.alat
    const entry = alatCount.get(a.id)
    if (entry) entry.jumlah++
    else alatCount.set(a.id, { nama: a.nama, kategori: a.kategori, jumlah: 1 })
  }
  const topAlat = [...alatCount.values()].sort((a, b) => b.jumlah - a.jumlah).slice(0, 5)
  const maxJumlah = topAlat[0]?.jumlah ?? 1

  const pages = Math.ceil(total / PER_HALAMAN)
  const buildHref = (overrides: Record<string, string>) => {
    const params = new URLSearchParams({
      ...(filter.status && { status: filter.status }),
      ...(sp.dari && filter.dari && { dari: sp.dari }),
      ...(sp.sampai && filter.sampai && { sampai: sp.sampai }),
      page: String(page),
      ...overrides,
    })
    return `/laporan?${params}`
  }
  const exportHref = (() => {
    const params = new URLSearchParams({
      ...(filter.status && { status: filter.status }),
      ...(sp.dari && filter.dari && { dari: sp.dari }),
      ...(sp.sampai && filter.sampai && { sampai: sp.sampai }),
    })
    const q = params.toString()
    return `/api/laporan/export${q ? `?${q}` : ''}`
  })()

  const statCards = [
    { label: 'Total', value: stats.total, color: '#5c84ff' },
    { label: 'Menunggu', value: stats.menunggu, color: '#eab308' },
    { label: 'Dipinjam', value: stats.dipinjam, color: '#3b82f6' },
    { label: 'Dikembalikan', value: stats.dikembalikan, color: '#22c55e' },
    { label: 'Dibatalkan', value: stats.dibatalkan, color: '#ef4444' },
    { label: 'Telat Kembali', value: stats.telat, color: '#f97316' },
  ]

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3 hud-rise">
        <div className="min-w-0 flex-1">
          <h1 className="hud-title" style={{ fontSize: 26 }}>Laporan Peminjaman</h1>
          <p className="mt-1.5 text-[15px]" style={{ color: '#8a97a3' }}>
            Rekap peminjaman, alat terpopuler, dan catatan kerusakan
          </p>
        </div>
        <a href={exportHref} className="hud-btn-primary flex items-center gap-2 px-[18px] py-2.5 text-[12px]">
          <Download className="h-4 w-4" />
          EXPORT EXCEL
        </a>
      </div>

      {/* Filters */}
      <div className="hud-panel mb-[18px] p-[18px] hud-rise">
        <form className="grid items-end gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <div>
            <label className="hud-label mb-1.5 block text-[11px]" style={{ color: '#8a97a3' }}>Status</label>
            <select
              name="status"
              defaultValue={filter.status}
              className="hud-input hud-clip-sm w-full appearance-none px-3 py-2 text-sm"
              style={{ colorScheme: 'dark' }}
            >
              <option value="" style={{ background: '#0f1420', color: '#e8edf2' }}>Semua Status</option>
              <option value="menunggu_verifikasi" style={{ background: '#0f1420', color: '#e8edf2' }}>Menunggu</option>
              <option value="dipinjam" style={{ background: '#0f1420', color: '#e8edf2' }}>Dipinjam</option>
              <option value="dikembalikan" style={{ background: '#0f1420', color: '#e8edf2' }}>Dikembalikan</option>
              <option value="dibatalkan" style={{ background: '#0f1420', color: '#e8edf2' }}>Dibatalkan</option>
            </select>
          </div>
          <div>
            <label className="hud-label mb-1.5 block text-[11px]" style={{ color: '#8a97a3' }}>Dari Tanggal</label>
            <input
              name="dari"
              type="date"
              defaultValue={sp.dari}
              className="hud-input hud-clip-sm w-full px-3 py-2 text-sm"
              style={{ colorScheme: 'dark' }}
            />
          </div>
          <div>
            <label className="hud-label mb-1.5 block text-[11px]" style={{ color: '#8a97a3' }}>Sampai Tanggal</label>
            <input
              name="sampai"
              type="date"
              defaultValue={sp.sampai}
              className="hud-input hud-clip-sm w-full px-3 py-2 text-sm"
              style={{ colorScheme: 'dark' }}
            />
          </div>
          <button type="submit" className="hud-btn-ghost hud-clip-sm py-2.5 text-[12px]">
            FILTER
          </button>
        </form>
      </div>

      {/* Stats — dihitung dari agregat DB, mengikuti rentang tanggal */}
      <div
        className="mb-[18px] grid gap-[13px]"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}
      >
        {statCards.map((s) => (
          <div
            key={s.label}
            className="hud-panel hud-accent-top hud-rise p-[18px] text-center"
            style={{
              background: `linear-gradient(160deg, ${s.color}12, rgba(255,255,255,0.012))`,
              border: `1px solid ${s.color}38`,
              ['--hud-blue2' as string]: s.color,
            }}
          >
            <p className="hud-title text-[30px]" style={{ color: s.color }}>{s.value}</p>
            <p className="mt-1 text-[12px]" style={{ color: '#6b7785' }}>{s.label}</p>
            <span
              className="hud-diamond absolute"
              style={{ right: 14, top: 14, width: 10, height: 10, background: s.color, boxShadow: `0 0 12px ${s.color}99` }}
            />
          </div>
        ))}
      </div>

      {/* Rekap: alat terpopuler + catatan kerusakan */}
      <div className="mb-[18px] grid gap-[13px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        <div className="hud-panel hud-rise p-[18px]">
          <div className="mb-3.5 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" style={{ color: '#5c84ff' }} />
            <h2 className="hud-label text-[11px]" style={{ color: '#c3ccd6' }}>Alat Paling Sering Dipinjam</h2>
          </div>
          {topAlat.length === 0 ? (
            <p className="py-6 text-center text-[13px]" style={{ color: '#6b7785' }}>Belum ada data</p>
          ) : (
            <ul className="space-y-3">
              {topAlat.map((a, i) => (
                <li key={a.nama}>
                  <div className="mb-1 flex items-baseline justify-between gap-3">
                    <p className="min-w-0 truncate text-[13.5px]" style={{ color: '#e8edf2' }}>
                      <span className="mr-1.5 font-bold" style={{ color: '#5c84ff' }}>{i + 1}.</span>
                      {a.nama}
                      <span className="ml-1.5 text-[11px]" style={{ color: '#6b7785' }}>{a.kategori}</span>
                    </p>
                    <p className="shrink-0 text-[13px] font-bold" style={{ color: '#5c84ff' }}>{a.jumlah}× unit</p>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full" style={{ background: 'rgba(99,102,241,0.12)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(6, Math.round((a.jumlah / maxJumlah) * 100))}%`,
                        background: 'linear-gradient(90deg, #3b82f6, #9333ea)',
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="hud-panel hud-rise p-[18px]">
          <div className="mb-3.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4" style={{ color: '#f97316' }} />
              <h2 className="hud-label text-[11px]" style={{ color: '#c3ccd6' }}>Catatan Kerusakan</h2>
            </div>
            {totalKerusakan > 0 && (
              <span
                className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                style={{ color: '#fb923c', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.35)' }}
              >
                {totalKerusakan} kasus
              </span>
            )}
          </div>
          {kerusakans.length === 0 ? (
            <p className="py-6 text-center text-[13px]" style={{ color: '#6b7785' }}>
              Tidak ada kerusakan tercatat — bagus!
            </p>
          ) : (
            <ul className="space-y-2.5">
              {kerusakans.map((k) => (
                <li
                  key={k.id}
                  className="px-3 py-2.5 hud-clip-sm"
                  style={{ background: 'rgba(249,115,22,0.04)', border: '1px solid rgba(249,115,22,0.18)' }}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[13px] font-semibold" style={{ color: '#e8edf2' }}>
                      {k.unit.alat.nama} <span style={{ color: '#fb923c' }}>({k.unit.kode})</span>
                    </p>
                    <p className="shrink-0 text-[11px]" style={{ color: '#6b7785' }}>
                      {formatDate(k.peminjaman.tanggalKembali)}
                    </p>
                  </div>
                  <p className="mt-0.5 text-[12px]" style={{ color: '#b3bdc7' }}>{k.kerusakan}</p>
                  <p className="mt-0.5 text-[11px]" style={{ color: '#6b7785' }}>
                    oleh {k.peminjaman.user.name}{k.peminjaman.user.kelas ? ` · ${k.peminjaman.user.kelas}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Mobile: daftar kartu peminjaman */}
      <div className="flex flex-col gap-2.5 md:hidden">
        {peminjamans.map((p) => (
          <div key={p.id} className="hud-panel p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[13px] font-bold" style={{ color: '#8a97a3' }}>#{p.id}</span>
              <StatusBadge status={p.status} />
            </div>
            <p className="text-[14.5px] font-semibold" style={{ color: '#e8edf2' }}>{p.user.name}</p>
            <p className="text-[12px]" style={{ color: '#6b7785' }}>{p.user.kelas ?? '-'}</p>
            <p className="mt-2 text-[12.5px] leading-relaxed" style={{ color: '#c3ccd6' }}>
              {p.details.map((d) => `${d.unit.alat.nama} (${d.unit.kode})`).join(', ')}
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px]" style={{ color: '#8a97a3' }}>
              <span>Pinjam: {formatDate(p.tanggalPinjam)}</span>
              <span className="inline-flex items-center gap-1.5">
                Kembali: {formatDate(p.tanggalKembali)}
                {isTelat(p, now) && (
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ color: '#fb923c', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.35)' }}
                  >
                    Telat
                  </span>
                )}
              </span>
            </div>
          </div>
        ))}
        {peminjamans.length === 0 && (
          <div className="hud-panel flex flex-col items-center justify-center py-12" style={{ color: '#6b7785' }}>
            <FileBarChart2 className="mb-2 h-10 w-10" />
            <p>Tidak ada data laporan</p>
          </div>
        )}
        {total > 0 && (
          <p className="px-1 py-1 text-[12px]" style={{ color: '#6b7785' }}>
            Menampilkan {(page - 1) * PER_HALAMAN + 1}–{Math.min(page * PER_HALAMAN, total)} dari {total} peminjaman
          </p>
        )}
      </div>

      {/* Desktop: tabel */}
      <div className="hidden hud-panel overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(99,102,241,0.16)' }} className="text-left">
                <th className="hud-label whitespace-nowrap px-4 py-3 text-[10px]" style={{ color: '#6b7785' }}>ID</th>
                <th className="hud-label whitespace-nowrap px-4 py-3 text-[10px]" style={{ color: '#6b7785' }}>Peminjam</th>
                <th className="hud-label whitespace-nowrap px-4 py-3 text-[10px]" style={{ color: '#6b7785' }}>Alat</th>
                <th className="hud-label whitespace-nowrap px-4 py-3 text-[10px]" style={{ color: '#6b7785' }}>Tanggal Pinjam</th>
                <th className="hud-label whitespace-nowrap px-4 py-3 text-[10px]" style={{ color: '#6b7785' }}>Tanggal Kembali</th>
                <th className="hud-label whitespace-nowrap px-4 py-3 text-[10px]" style={{ color: '#6b7785' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {peminjamans.map((p) => (
                <tr key={p.id} className="transition hover:bg-white/[0.02]" style={{ borderBottom: '1px solid rgba(99,102,241,0.08)' }}>
                  <td className="whitespace-nowrap px-4 py-3" style={{ color: '#8a97a3' }}>#{p.id}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <p style={{ color: '#e8edf2' }}>{p.user.name}</p>
                    <p className="text-xs" style={{ color: '#6b7785' }}>{p.user.kelas ?? '-'}</p>
                  </td>
                  <td className="max-w-[320px] truncate whitespace-nowrap px-4 py-3" style={{ color: '#c3ccd6' }}>
                    {p.details.map((d) => `${d.unit.alat.nama} (${d.unit.kode})`).join(', ')}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3" style={{ color: '#8a97a3' }}>{formatDate(p.tanggalPinjam)}</td>
                  <td className="whitespace-nowrap px-4 py-3" style={{ color: '#8a97a3' }}>
                    {formatDate(p.tanggalKembali)}
                    {isTelat(p, now) && (
                      <span
                        className="ml-2 rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
                        style={{ color: '#fb923c', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.35)' }}
                      >
                        Telat
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {peminjamans.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12" style={{ color: '#6b7785' }}>
            <FileBarChart2 className="mb-2 h-10 w-10" />
            <p>Tidak ada data laporan</p>
          </div>
        )}
        {total > 0 && (
          <p className="px-4 py-3 text-[12px]" style={{ color: '#6b7785', borderTop: '1px solid rgba(99,102,241,0.08)' }}>
            Menampilkan {(page - 1) * PER_HALAMAN + 1}–{Math.min(page * PER_HALAMAN, total)} dari {total} peminjaman
          </p>
        )}
      </div>

      {pages > 1 && (
        <div className="mt-[18px] flex flex-wrap justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={buildHref({ page: String(p) })}
              className="hud-clip-sm px-3 py-1.5 text-[13px] transition"
              style={
                p === page
                  ? { color: '#fff', background: 'linear-gradient(135deg, #2563eb, #9333ea)' }
                  : { color: '#8a97a3', border: '1px solid rgba(99,102,241,0.25)' }
              }
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
