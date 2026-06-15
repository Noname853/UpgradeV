import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
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

  if (isAdmin) {
    return (
      <div>
        {/* header */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 hud-rise">
          <div>
            <h1 className="hud-title" style={{ fontSize: 24 }}>Manajemen Alat</h1>
            <p className="mt-1.5 text-[14px]" style={{ color: '#8a97a3' }}>{total} alat terdaftar</p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link href="/alat/import" className="hud-btn-ghost flex items-center gap-2 px-4 py-2.5 text-[12px]">
              <FileSpreadsheet className="h-4 w-4" />
              <span className="hidden sm:inline">Import Excel</span>
              <span className="sm:hidden">Import</span>
            </Link>
            <Link href="/alat/baru" className="hud-btn-primary flex items-center gap-2 px-[18px] py-2.5 text-[12px]">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Tambah Alat</span>
              <span className="sm:hidden">Tambah</span>
            </Link>
          </div>
        </div>

        {/* filters */}
        <div className="hud-panel hud-rise mb-[18px] p-3.5">
          <form className="flex flex-col gap-[11px] sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: '#6b7785' }} />
              <input
                name="search"
                defaultValue={search}
                placeholder="Cari nama atau kode..."
                className="hud-input w-full py-2.5 pl-9 pr-3 text-sm"
              />
            </div>
            <select
              name="kategori"
              defaultValue={kategori}
              className="hud-input w-full px-3.5 py-2.5 text-sm sm:w-auto"
              style={{ background: '#0e0f14' }}
            >
              <option value="">Semua Kategori</option>
              {kategoris.map((k) => (
                <option key={k.kategori} value={k.kategori}>
                  {k.kategori}
                </option>
              ))}
            </select>
            <div className="flex gap-2.5">
              <button type="submit" className="hud-btn-ghost flex-1 px-5 py-2.5 text-[12px] sm:flex-none">
                Filter
              </button>
              {(search || kategori) && (
                <Link
                  href="/alat"
                  className="hud-btn-ghost flex-1 px-4 py-2.5 text-center text-[12px] sm:flex-none"
                >
                  Reset
                </Link>
              )}
            </div>
          </form>
        </div>

        {/* grid */}
        {alats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16" style={{ color: '#6b7785' }}>
            <Package className="mb-3 h-12 w-12" />
            <p>Tidak ada alat ditemukan</p>
          </div>
        ) : (
          <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
            {alats.map((alat) => {
              const dipinjam = alat.peminjamanDetails.reduce((s, d) => s + d.jumlah, 0)
              const stokTersedia = alat.stok - dipinjam
              return (
                <Link key={alat.id} href={`/alat/${alat.id}`}>
                  <div className="hud-panel hud-card-hover hud-rise p-[17px]">
                    <div className="mb-3 flex items-start justify-between">
                      <div
                        className="hud-hex-wide flex h-[38px] w-[38px] items-center justify-center"
                        style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)' }}
                      >
                        <Package className="h-[18px] w-[18px]" style={{ color: '#3b82f6' }} />
                      </div>
                      <StockBadge stok={alat.stok} stokTersedia={stokTersedia} />
                    </div>
                    <h3 className="mb-1 text-[16px] font-bold line-clamp-2" style={{ color: '#f0f4f8' }}>{alat.nama}</h3>
                    <p className="mb-3 text-xs" style={{ color: '#6b7785' }}>{alat.kode} · {alat.kategori}</p>
                    <div className="flex items-center justify-between text-xs" style={{ color: '#6b7785' }}>
                      <span>{alat.lokasi}</span>
                      <span>{formatDate(alat.createdAt)}</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* pagination */}
        {pages > 1 && (
          <div className="mt-[18px] flex flex-wrap justify-center gap-2">
            {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={`/alat?${new URLSearchParams({ ...(search && { search }), ...(kategori && { kategori }), page: String(p) })}`}
                className="hud-clip-sm min-w-[40px] px-3 py-2 text-center text-sm"
                style={
                  p === page
                    ? { background: 'linear-gradient(135deg, #2563eb, #9333ea)', color: '#fff' }
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

  return (
    <div className="mx-auto max-w-[1120px]">
      {/* header */}
      <div className="mb-5 hud-rise">
        <h1 className="hud-title" style={{ fontSize: 24 }}>Daftar Alat</h1>
        <p className="mt-1.5 text-[14px]" style={{ color: '#8a97a3' }}>{total} alat terdaftar · pilih alat untuk melihat detail</p>
      </div>

      {/* filters */}
      <div className="hud-panel hud-rise mb-[18px] p-3.5">
        <form className="flex flex-col gap-[11px] sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: '#6b7785' }} />
            <input
              name="search"
              defaultValue={search}
              placeholder="Cari nama atau kode..."
              className="hud-input w-full py-2.5 pl-9 pr-3 text-sm"
            />
          </div>
          <select
            name="kategori"
            defaultValue={kategori}
            className="hud-input w-full px-3.5 py-2.5 text-sm sm:w-auto"
            style={{ background: '#0e0f14' }}
          >
            <option value="">Semua Kategori</option>
            {kategoris.map((k) => (
              <option key={k.kategori} value={k.kategori}>
                {k.kategori}
              </option>
            ))}
          </select>
          <div className="flex gap-2.5">
            <button type="submit" className="hud-btn-ghost flex-1 px-5 py-2.5 text-[12px] sm:flex-none">
              Filter
            </button>
            {(search || kategori) && (
              <Link
                href="/alat"
                className="hud-btn-ghost flex-1 px-4 py-2.5 text-center text-[12px] sm:flex-none"
              >
                Reset
              </Link>
            )}
          </div>
        </form>
      </div>

      {/* grid */}
      {alats.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16" style={{ color: '#6b7785' }}>
          <Package className="mb-3 h-12 w-12" />
          <p>Tidak ada alat ditemukan</p>
        </div>
      ) : (
        <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
          {alats.map((alat) => {
            const dipinjam = alat.peminjamanDetails.reduce((s, d) => s + d.jumlah, 0)
            const stokTersedia = alat.stok - dipinjam
            return (
              <Link key={alat.id} href={`/alat/${alat.id}`}>
                <div className="hud-panel hud-card-hover hud-rise p-[17px]">
                  <div className="mb-3 flex items-start justify-between">
                    <div
                      className="hud-hex-wide flex h-[38px] w-[38px] items-center justify-center"
                      style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)' }}
                    >
                      <Package className="h-[18px] w-[18px]" style={{ color: '#3b82f6' }} />
                    </div>
                    <StockBadge stok={alat.stok} stokTersedia={stokTersedia} />
                  </div>
                  <h3 className="mb-1 text-[16px] font-bold line-clamp-2" style={{ color: '#f0f4f8' }}>{alat.nama}</h3>
                  <p className="mb-3 text-xs" style={{ color: '#6b7785' }}>{alat.kode} · {alat.kategori}</p>
                  <div className="flex items-center justify-between text-xs" style={{ color: '#6b7785' }}>
                    <span>{alat.lokasi}</span>
                    <span>{formatDate(alat.createdAt)}</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* pagination */}
      {pages > 1 && (
        <div className="mt-[18px] flex flex-wrap justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/alat?${new URLSearchParams({ ...(search && { search }), ...(kategori && { kategori }), page: String(p) })}`}
              className="hud-clip-sm min-w-[40px] px-3 py-2 text-center text-sm"
              style={
                p === page
                  ? { background: 'linear-gradient(135deg, #2563eb, #9333ea)', color: '#fff' }
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
