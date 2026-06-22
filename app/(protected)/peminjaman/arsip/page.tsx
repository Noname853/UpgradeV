import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDate } from '@/lib/utils'
import { redirect } from 'next/navigation'
import { PackageCheck, ArrowLeft, Search, X } from 'lucide-react'
import Link from 'next/link'

const ARCHIVE_DAYS = 30

interface SearchParams {
  page?: string
  search?: string
  kelas?: string
}

function buildQueryString(params: Record<string, string>) {
  const filtered = Object.entries(params).filter(([, v]) => v)
  return filtered.length ? `?${new URLSearchParams(filtered).toString()}` : ''
}

export default async function ArsipPeminjamanPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await auth()
  if (session?.user.role !== 'admin') redirect('/peminjaman')

  const sp = await searchParams
  const page = parseInt(sp.page ?? '1')
  const search = sp.search ?? ''
  const kelasFilter = sp.kelas ?? ''
  const limit = 10

  const archiveCutoff = new Date()
  archiveCutoff.setDate(archiveCutoff.getDate() - ARCHIVE_DAYS)

  const where = {
    OR: [
      { status: 'dikembalikan', tanggalKembali: { lt: archiveCutoff } },
      { status: 'dibatalkan', tanggalBatal: { lt: archiveCutoff } },
    ],
    ...(search
      ? {
          AND: [
            {
              OR: [
                { user: { name: { contains: search } } },
                { details: { some: { alat: { nama: { contains: search } } } } },
              ],
            },
          ],
        }
      : {}),
    ...(kelasFilter ? { user: { kelas: kelasFilter } } : {}),
  }

  const [peminjamans, total, kelasList] = await Promise.all([
    prisma.peminjaman.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, kelas: true, isActive: true } },
        details: {
          take: 2,
          include: { alat: { select: { nama: true } } },
        },
      },
    }),
    prisma.peminjaman.count({ where }),
    prisma.user.findMany({
      where: { role: 'siswa', kelas: { not: null } },
      select: { kelas: true },
      distinct: ['kelas'],
      orderBy: { kelas: 'asc' },
    }),
  ])

  const pages = Math.ceil(total / limit)
  const distinctKelas = kelasList
    .map((u) => u.kelas)
    .filter((k): k is string => k !== null)
  const hasFilters = search || kelasFilter

  return (
    <div>
      <div className="mb-[18px] flex flex-wrap items-center justify-between gap-3 hud-rise">
        <div>
          <h1 className="hud-title inline-flex items-center gap-2.5" style={{ fontSize: 24 }}>
            Arsip Peminjaman
          </h1>
          <p className="mt-1.5 text-[14px]" style={{ color: '#8a97a3' }}>
            {total.toLocaleString('id-ID')} peminjaman terarsip
          </p>
        </div>
        <Link
          href="/peminjaman"
          className="hud-clip-sm inline-flex items-center gap-2 px-4 py-2.5 text-[12px] font-semibold transition"
          style={{ color: '#8a97a3', border: '1px solid rgba(99,102,241,0.25)' }}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          KEMBALI KE AKTIF
        </Link>
      </div>

      {/* Filter bar */}
      <form className="mb-[18px] flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1" style={{ minWidth: 220 }}>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: '#6b7785' }} />
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="Cari di arsip…"
            className="hud-clip-sm w-full py-[9px] pl-9 pr-3 text-[13.5px] outline-none transition"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(99,102,241,0.28)',
              color: '#e8edf2',
            }}
          />
        </div>
        <select
          name="kelas"
          defaultValue={kelasFilter}
          className="hud-clip-sm py-[9px] px-3 text-[13.5px] outline-none"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(99,102,241,0.28)',
            color: '#e8edf2',
            minWidth: 160,
            colorScheme: 'dark',
          }}
        >
          <option value="" style={{ background: '#0f1420', color: '#e8edf2' }}>Semua Kelas</option>
          {distinctKelas.map((k) => (
            <option key={k} value={k} style={{ background: '#0f1420', color: '#e8edf2' }}>{k}</option>
          ))}
        </select>
        <button
          type="submit"
          className="hud-clip-sm px-4 py-[9px] text-[12px] font-semibold transition"
          style={{ background: 'rgba(92,132,255,0.14)', color: '#9bb3ff', border: '1px solid rgba(92,132,255,0.35)' }}
        >
          CARI
        </button>
        {hasFilters && (
          <Link
            href="/peminjaman/arsip"
            className="hud-clip-sm inline-flex items-center gap-1 px-3 py-[9px] text-[12px] transition"
            style={{ color: '#8a97a3', border: '1px solid rgba(99,102,241,0.16)' }}
          >
            <X className="h-3 w-3" />
            Reset
          </Link>
        )}
      </form>

      {/* Active filter chips */}
      {hasFilters && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="hud-label text-[10px]" style={{ color: '#6b7785', letterSpacing: '1.5px' }}>FILTER AKTIF:</span>
          {kelasFilter && (
            <Link
              href={`/peminjaman/arsip${buildQueryString({ search, kelas: '' })}`}
              className="hud-clip-sm inline-flex items-center gap-1 px-2.5 py-1 text-[12px]"
              style={{ background: 'rgba(92,132,255,0.14)', color: '#fff', border: '1px solid rgba(92,132,255,0.45)' }}
            >
              Kelas: {kelasFilter} <X className="h-3 w-3" />
            </Link>
          )}
          {search && (
            <Link
              href={`/peminjaman/arsip${buildQueryString({ search: '', kelas: kelasFilter })}`}
              className="hud-clip-sm inline-flex items-center gap-1 px-2.5 py-1 text-[12px]"
              style={{ background: 'rgba(92,132,255,0.14)', color: '#fff', border: '1px solid rgba(92,132,255,0.45)' }}
            >
              &ldquo;{search}&rdquo; <X className="h-3 w-3" />
            </Link>
          )}
        </div>
      )}

      {/* Table */}
      <div className="hud-panel overflow-x-auto">
        <table className="w-full min-w-[780px] border-collapse">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(99,102,241,0.16)' }}>
              <th className="hud-label px-4 py-3 text-left text-[10px]" style={{ color: '#6b7785' }}>ID</th>
              <th className="hud-label px-4 py-3 text-left text-[10px]" style={{ color: '#6b7785' }}>Peminjam</th>
              <th className="hud-label px-4 py-3 text-left text-[10px]" style={{ color: '#6b7785' }}>Alat</th>
              <th className="hud-label px-4 py-3 text-left text-[10px]" style={{ color: '#6b7785' }}>Dipinjam</th>
              <th className="hud-label px-4 py-3 text-left text-[10px]" style={{ color: '#6b7785' }}>Dikembalikan</th>
              <th className="hud-label px-4 py-3 text-left text-[10px]" style={{ color: '#6b7785' }}>Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {peminjamans.map((p) => {
              const isInactive = !p.user.isActive
              return (
                <tr
                  key={p.id}
                  style={{
                    borderBottom: '1px solid rgba(99,102,241,0.08)',
                    opacity: isInactive ? 0.6 : 1,
                  }}
                >
                  <td className="px-4 py-3 text-[13px]" style={{ color: '#8a97a3' }}>#{p.id}</td>
                  <td className="px-4 py-3">
                    <p className="text-[14px] font-semibold" style={{ color: '#e8edf2' }}>
                      {p.user.name}
                    </p>
                    <p className="mt-px text-[12px]" style={{ color: '#6b7785' }}>
                      {p.user.kelas ?? '-'}
                      {isInactive && ' · Nonaktif'}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-[13.5px] line-clamp-1" style={{ color: '#c3ccd6' }}>
                      {p.details.map((d) => d.alat.nama).join(', ')}
                      {p.totalItems > p.details.length && ` +${p.totalItems - p.details.length} lainnya`}
                    </p>
                    <p className="mt-px text-[12px]" style={{ color: '#6b7785' }}>{p.totalItems} item</p>
                  </td>
                  <td className="px-4 py-3 text-[13px]" style={{ color: '#8a97a3' }}>{formatDate(p.tanggalPinjam)}</td>
                  <td className="px-4 py-3 text-[13px]" style={{ color: '#8a97a3' }}>
                    {formatDate(p.tanggalKembali ?? p.tanggalBatal)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/peminjaman/${p.id}`}
                      className="whitespace-nowrap text-[12.5px] font-semibold"
                      style={{ color: '#5c84ff' }}
                    >
                      Detail →
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {peminjamans.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12" style={{ color: '#6b7785' }}>
            <PackageCheck className="mb-2 h-10 w-10" />
            <p>{hasFilters ? 'Tidak ada arsip yang cocok dengan filter' : 'Belum ada peminjaman yang diarsipkan'}</p>
          </div>
        )}
      </div>

      {pages > 1 && (
        <div className="mt-[18px] flex flex-wrap justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => {
            const active = p === page
            return (
              <Link
                key={p}
                href={`/peminjaman/arsip${buildQueryString({ search, kelas: kelasFilter, page: String(p) })}`}
                className="min-w-[40px] px-3 py-2 text-center text-[13px] hud-clip-sm"
                style={
                  active
                    ? { color: '#fff', background: 'linear-gradient(135deg, #2563eb, #9333ea)' }
                    : { color: '#8a97a3', border: '1px solid rgba(99,102,241,0.25)' }
                }
              >
                {p}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
