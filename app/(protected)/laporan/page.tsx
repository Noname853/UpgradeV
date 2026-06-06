import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { GlassCard } from '@/components/shared/GlassCard'
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Laporan Peminjaman</h1>
          <p className="text-sm text-neutral-400">Data peminjaman keseluruhan</p>
        </div>
      </div>

      {/* Filters */}
      <GlassCard className="p-4">
        <form className="flex flex-col gap-3">
          <select
            name="status"
            defaultValue={status}
            className="w-full appearance-none rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-center text-sm text-neutral-300 outline-none focus:border-blue-500"
          >
            <option value="">Semua Status</option>
            <option value="menunggu_verifikasi">Menunggu</option>
            <option value="dipinjam">Dipinjam</option>
            <option value="dikembalikan">Dikembalikan</option>
            <option value="dibatalkan">Dibatalkan</option>
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input
              name="dari"
              type="date"
              defaultValue={sp.dari}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-300 outline-none focus:border-blue-500"
            />
            <input
              name="sampai"
              type="date"
              defaultValue={sp.sampai}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-300 outline-none focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg border border-neutral-700 py-2 text-sm text-neutral-300 hover:text-white"
          >
            Filter
          </button>
        </form>
      </GlassCard>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-white' },
          { label: 'Dipinjam', value: stats.dipinjam, color: 'text-blue-400' },
          { label: 'Dikembalikan', value: stats.dikembalikan, color: 'text-green-400' },
          { label: 'Dibatalkan', value: stats.dibatalkan, color: 'text-red-400' },
        ].map((s) => (
          <GlassCard key={s.label} className="p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-neutral-500">{s.label}</p>
          </GlassCard>
        ))}
      </div>

      {/* Table */}
      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-left">
                <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">ID</th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">Peminjam</th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">Alat</th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">Tanggal Pinjam</th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">Tanggal Kembali</th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {peminjamans.map((p) => (
                <tr key={p.id} className="transition hover:bg-white/[0.02]">
                  <td className="whitespace-nowrap px-4 py-3 text-neutral-400">#{p.id}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <p className="text-white">{p.user.name}</p>
                    <p className="text-xs text-neutral-500">{p.user.kelas ?? '-'}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-neutral-300">
                    {p.details.map((d) => d.alat.nama).join(', ')}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-neutral-400">{formatDate(p.tanggalPinjam)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-neutral-400">{formatDate(p.tanggalKembali)}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {peminjamans.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-neutral-600">
            <FileBarChart2 className="mb-2 h-10 w-10" />
            <p>Tidak ada data laporan</p>
          </div>
        )}
      </GlassCard>
    </div>
  )
}
