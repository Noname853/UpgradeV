import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { GlassCard } from '@/components/shared/GlassCard'
import { StockBadge } from '@/components/shared/StockBadge'
import { formatDate } from '@/lib/utils'
import { Plus, Search, Package, FileSpreadsheet } from 'lucide-react'
import Link from 'next/link'

interface SearchParams {
  search?: string
  kategori?: string
  page?: string
}

export default async function AlatPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams
  const search = sp.search ?? ''
  const kategori = sp.kategori ?? ''
  const page = parseInt(sp.page ?? '1')
  const limit = 12

  const session = await auth()
  const isAdmin = session?.user.role === 'admin'

  const where = {
    AND: [
      search ? { OR: [{ nama: { contains: search } }, { kode: { contains: search } }] } : {},
      kategori ? { kategori } : {},
    ],
  }

  const [alats, total, kategoris] = await Promise.all([
    prisma.alat.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { nama: 'asc' },
      include: {
        peminjamanDetails: {
          where: { peminjaman: { status: { in: ['menunggu_verifikasi', 'dipinjam'] } } },
          select: { jumlah: true },
        },
      },
    }),
    prisma.alat.count({ where }),
    prisma.alat.findMany({ select: { kategori: true }, distinct: ['kategori'] }),
  ])

  const pages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">Manajemen Alat</h1>
          <p className="text-sm text-neutral-400">{total} alat terdaftar</p>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <Link
              href="/alat/import"
              className="flex items-center gap-2 rounded-lg border border-neutral-700 px-3 py-2 text-sm font-semibold text-neutral-300 transition hover:border-neutral-600 hover:text-white sm:px-4"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span className="hidden sm:inline">Import Excel</span>
              <span className="sm:hidden">Import</span>
            </Link>
            <Link
              href="/alat/baru"
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-3 py-2 text-sm font-semibold text-white transition hover:from-blue-500 hover:to-purple-500 sm:px-4"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Tambah Alat</span>
              <span className="sm:hidden">Tambah</span>
            </Link>
          </div>
        )}
      </div>

      {/* Filters */}
      <GlassCard className="p-4">
        <form className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <div className="relative w-full sm:flex-1 sm:min-w-48">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
            <input
              name="search"
              defaultValue={search}
              placeholder="Cari nama atau kode..."
              className="w-full rounded-lg border border-neutral-700 bg-white/[0.03] py-2.5 pl-9 pr-3 text-sm text-white placeholder-neutral-600 outline-none focus:border-blue-500"
            />
          </div>
          <select
            name="kategori"
            defaultValue={kategori}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm text-neutral-300 outline-none focus:border-blue-500 sm:w-auto"
          >
            <option value="">Semua Kategori</option>
            {kategoris.map((k) => (
              <option key={k.kategori} value={k.kategori}>
                {k.kategori}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 rounded-lg border border-neutral-700 px-4 py-2.5 text-sm text-neutral-300 transition hover:border-neutral-600 hover:text-white sm:flex-none"
            >
              Filter
            </button>
            {(search || kategori) && (
              <Link
                href="/alat"
                className="flex-1 rounded-lg border border-neutral-800 px-3 py-2.5 text-center text-sm text-neutral-500 hover:text-white sm:flex-none sm:border-0"
              >
                Reset
              </Link>
            )}
          </div>
        </form>
      </GlassCard>

      {/* Grid */}
      {alats.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-neutral-600">
          <Package className="mb-3 h-12 w-12" />
          <p>Tidak ada alat ditemukan</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {alats.map((alat) => {
            const dipinjam = alat.peminjamanDetails.reduce((s, d) => s + d.jumlah, 0)
            const stokTersedia = alat.stok - dipinjam
            return (
              <Link key={alat.id} href={`/alat/${alat.id}`}>
                <GlassCard className="p-4 transition hover:border-neutral-700">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="rounded-lg bg-blue-500/10 p-2">
                      <Package className="h-5 w-5 text-blue-400" />
                    </div>
                    <StockBadge stok={alat.stok} stokTersedia={stokTersedia} />
                  </div>
                  <h3 className="mb-1 font-semibold text-white line-clamp-2">{alat.nama}</h3>
                  <p className="mb-3 text-xs text-neutral-500">{alat.kode} · {alat.kategori}</p>
                  <div className="flex items-center justify-between text-xs text-neutral-600">
                    <span>{alat.lokasi}</span>
                    <span>{formatDate(alat.createdAt)}</span>
                  </div>
                </GlassCard>
              </Link>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex flex-wrap justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/alat?${new URLSearchParams({ ...(search && { search }), ...(kategori && { kategori }), page: String(p) })}`}
              className={`min-w-[40px] rounded-lg px-3 py-2 text-center text-sm transition ${
                p === page
                  ? 'bg-blue-600 text-white'
                  : 'border border-neutral-700 text-neutral-400 hover:border-neutral-600 hover:text-white'
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
