import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDate } from '@/lib/utils'
import { FileBarChart2 } from 'lucide-react'

interface SearchParams {
  status?: string
  dari?: string
  sampai?: string
}

export default async function LaporanPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await auth()
  if (session?.user.role !== 'admin') redirect('/dashboard')

  const sp = await searchParams
  const status = sp.status ?? ''
  const dari = sp.dari ? new Date(sp.dari) : undefined
  const sampai = sp.sampai ? new Date(sp.sampai + 'T23:59:59') : undefined

  const where = {
    ...(status ? { status } : {}),
    ...(dari || sampai ? { tanggalPinjam: { ...(dari ? { gte: dari } : {}), ...(sampai ? { lte: sampai } : {}) } } : {}),
  }

  const peminjamans = await prisma.peminjaman.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { name: true, kelas: true } },
      details: {
        include: { alat: { select: { nama: true, kode: true } } },
      },
    },
    take: 100,
  })

  const stats = {
    total: peminjamans.length,
    dipinjam: peminjamans.filter((p) => p.status === 'dipinjam').length,
    dikembalikan: peminjamans.filter((p) => p.status === 'dikembalikan').length,
    dibatalkan: peminjamans.filter((p) => p.status === 'dibatalkan').length,
  }

  const statCards = [
    { label: 'Total', value: stats.total, color: '#5c84ff' },
    { label: 'Dipinjam', value: stats.dipinjam, color: '#3b82f6' },
    { label: 'Dikembalikan', value: stats.dikembalikan, color: '#22c55e' },
    { label: 'Dibatalkan', value: stats.dibatalkan, color: '#ef4444' },
  ]

  return (
    <div className="mx-auto max-w-[1120px]">
      <div className="mb-6 hud-rise">
        <h1 className="hud-title" style={{ fontSize: 26 }}>Laporan Peminjaman</h1>
        <p className="mt-1.5 text-[15px]" style={{ color: '#8a97a3' }}>
          Data peminjaman keseluruhan
        </p>
      </div>

      {/* Filters */}
      <div className="hud-panel mb-[18px] p-[18px] hud-rise">
        <form className="flex flex-col gap-3">
          <select
            name="status"
            defaultValue={status}
            className="hud-input hud-clip-sm w-full appearance-none px-3 py-2 text-sm"
          >
            <option value="">Semua Status</option>
            <option value="menunggu_verifikasi">Menunggu</option>
            <option value="dipinjam">Dipinjam</option>
            <option value="dikembalikan">Dikembalikan</option>
            <option value="dibatalkan">Dibatalkan</option>
          </select>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="hud-label mb-1.5 block text-[11px]" style={{ color: '#8a97a3' }}>Dari Tanggal</label>
              <input
                name="dari"
                type="date"
                defaultValue={sp.dari}
                className="hud-input hud-clip-sm w-full px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="hud-label mb-1.5 block text-[11px]" style={{ color: '#8a97a3' }}>Sampai Tanggal</label>
              <input
                name="sampai"
                type="date"
                defaultValue={sp.sampai}
                className="hud-input hud-clip-sm w-full px-3 py-2 text-sm"
              />
            </div>
          </div>
          <button type="submit" className="hud-btn-ghost hud-clip-sm w-full py-2.5 text-[12px]">
            FILTER
          </button>
        </form>
      </div>

      {/* Stats */}
      <div
        className="mb-[18px] grid gap-[13px]"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}
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

      {/* Table */}
      <div className="hud-panel overflow-hidden">
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
                  <td className="whitespace-nowrap px-4 py-3" style={{ color: '#c3ccd6' }}>
                    {p.details.map((d) => d.alat.nama).join(', ')}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3" style={{ color: '#8a97a3' }}>{formatDate(p.tanggalPinjam)}</td>
                  <td className="whitespace-nowrap px-4 py-3" style={{ color: '#8a97a3' }}>{formatDate(p.tanggalKembali)}</td>
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
      </div>
    </div>
  )
}
