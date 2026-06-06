import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { GlassCard } from '@/components/shared/GlassCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDate } from '@/lib/utils'
import { Plus, PackageCheck } from 'lucide-react'
import Link from 'next/link'

const STATUS_TABS = [
  { label: 'Semua', value: '' },
  { label: 'Menunggu', value: 'menunggu_verifikasi' },
  { label: 'Dipinjam', value: 'dipinjam' },
  { label: 'Dikembalikan', value: 'dikembalikan' },
  { label: 'Dibatalkan', value: 'dibatalkan' },
]

interface SearchParams {
  status?: string
  page?: string
}

export default async function PeminjamanPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams
  const status = sp.status ?? ''
  const page = parseInt(sp.page ?? '1')
  const limit = 10

  const session = await auth()
  const isAdmin = session?.user.role === 'admin'
  const userId = parseInt(session?.user.id ?? '0')

  const where = {
    ...(isAdmin ? {} : { userId }),
    ...(status ? { status } : {}),
  }

  const [peminjamans, total] = await Promise.all([
    prisma.peminjaman.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, kelas: true } },
        details: {
          take: 2,
          include: { alat: { select: { nama: true } } },
        },
      },
    }),
    prisma.peminjaman.count({ where }),
  ])

  const pages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">Peminjaman</h1>
          <p className="text-sm text-neutral-400">{total} total peminjaman</p>
        </div>
        {!isAdmin && (
          <Link
            href="/peminjaman/baru"
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:from-blue-500 hover:to-purple-500"
          >
            <Plus className="h-4 w-4" />
            Buat Peminjaman
          </Link>
        )}
      </div>

      {/* Status tabs */}
      <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <div className="inline-flex gap-1 rounded-xl border border-neutral-800 bg-white/[0.02] p-1">
          {STATUS_TABS.map((tab) => (
            <Link
              key={tab.value}
              href={`/peminjaman${tab.value ? `?status=${tab.value}` : ''}`}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm transition ${
                status === tab.value
                  ? 'bg-white/[0.08] text-white font-medium'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Table */}
      <GlassCard className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-neutral-800 text-left">
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">ID</th>
              {isAdmin && (
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">Peminjam</th>
              )}
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">Alat</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">Tanggal</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {peminjamans.map((p) => (
              <tr key={p.id} className="transition hover:bg-white/[0.02]">
                <td className="px-4 py-3 text-sm text-neutral-400">#{p.id}</td>
                {isAdmin && (
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-white">{p.user.name}</p>
                    <p className="text-xs text-neutral-500">{p.user.kelas ?? '-'}</p>
                  </td>
                )}
                <td className="px-4 py-3">
                  <p className="text-sm text-white line-clamp-1">
                    {p.details.map((d) => d.alat.nama).join(', ')}
                    {p.totalItems > p.details.length && ` +${p.totalItems - p.details.length} lainnya`}
                  </p>
                  <p className="text-xs text-neutral-500">{p.totalItems} item</p>
                </td>
                <td className="px-4 py-3 text-sm text-neutral-400">{formatDate(p.tanggalPinjam)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={p.status} />
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/peminjaman/${p.id}`}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Detail →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {peminjamans.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-neutral-600">
            <PackageCheck className="mb-2 h-10 w-10" />
            <p>Tidak ada peminjaman</p>
          </div>
        )}
      </GlassCard>

      {pages > 1 && (
        <div className="flex flex-wrap justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/peminjaman?${new URLSearchParams({ ...(status && { status }), page: String(p) })}`}
              className={`min-w-[40px] rounded-lg px-3 py-2 text-center text-sm ${
                p === page ? 'bg-blue-600 text-white' : 'border border-neutral-700 text-neutral-400 hover:text-white'
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
