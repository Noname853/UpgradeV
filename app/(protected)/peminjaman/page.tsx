import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDate } from '@/lib/utils'
import { Plus, PackageCheck, Search, Archive, X } from 'lucide-react'
import Link from 'next/link'

const STATUS_TABS = [
  { label: 'Semua', value: '' },
  { label: 'Menunggu', value: 'menunggu_verifikasi' },
  { label: 'Dipinjam', value: 'dipinjam' },
  { label: 'Dikembalikan', value: 'dikembalikan' },
  { label: 'Dibatalkan', value: 'dibatalkan' },
]

const ARCHIVE_DAYS = 30

interface SearchParams {
  status?: string
  page?: string
  search?: string
  kelas?: string
}

function buildQueryString(params: Record<string, string>) {
  const filtered = Object.entries(params).filter(([, v]) => v)
  return filtered.length ? `?${new URLSearchParams(filtered).toString()}` : ''
}

export default async function PeminjamanPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams
  const status = sp.status ?? ''
  const page = parseInt(sp.page ?? '1')
  const search = sp.search ?? ''
  const kelasFilter = sp.kelas ?? ''
  const limit = 10

  const session = await auth()
  const isAdmin = session?.user.role === 'admin'
  const userId = parseInt(session?.user.id ?? '0')

  const archiveCutoff = new Date()
  archiveCutoff.setDate(archiveCutoff.getDate() - ARCHIVE_DAYS)

  const archiveCondition = {
    OR: [
      { status: 'dikembalikan', tanggalKembali: { lt: archiveCutoff } },
      { status: 'dibatalkan', tanggalBatal: { lt: archiveCutoff } },
    ],
  }

  const activeCondition = {
    NOT: archiveCondition,
  }

  const where = {
    ...(isAdmin ? {} : { userId }),
    ...(status ? { status } : {}),
    ...(isAdmin ? activeCondition : {}),
    ...(search
      ? {
          OR: [
            { user: { name: { contains: search } } },
            { details: { some: { alat: { nama: { contains: search } } } } },
          ],
        }
      : {}),
    ...(kelasFilter ? { user: { kelas: kelasFilter } } : {}),
  }

  const [peminjamans, total, archivedCount, kelasList, statusCounts] = await Promise.all([
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
    isAdmin
      ? prisma.peminjaman.count({ where: archiveCondition })
      : Promise.resolve(0),
    isAdmin
      ? prisma.user.findMany({
          where: { role: 'siswa', isActive: true, kelas: { not: null } },
          select: { kelas: true },
          distinct: ['kelas'],
          orderBy: { kelas: 'asc' },
        })
      : Promise.resolve([]),
    isAdmin
      ? Promise.all(
          STATUS_TABS.filter((t) => t.value).map(async (tab) => ({
            value: tab.value,
            count: await prisma.peminjaman.count({
              where: {
                status: tab.value,
                ...activeCondition,
                ...(search
                  ? {
                      OR: [
                        { user: { name: { contains: search } } },
                        { details: { some: { alat: { nama: { contains: search } } } } },
                      ],
                    }
                  : {}),
                ...(kelasFilter ? { user: { kelas: kelasFilter } } : {}),
              },
            }),
          }))
        )
      : Promise.resolve([]),
  ])

  const pages = Math.ceil(total / limit)
  const countMap = Object.fromEntries(statusCounts.map((s) => [s.value, s.count]))
  const distinctKelas = kelasList
    .map((u) => u.kelas)
    .filter((k): k is string => k !== null)

  const hasFilters = search || kelasFilter

  if (isAdmin) {
    return (
      <div>
        <div className="mb-[18px] flex flex-wrap items-center justify-between gap-3 hud-rise">
          <div>
            <h1 className="hud-title" style={{ fontSize: 24 }}>Peminjaman</h1>
            <p className="mt-1.5 text-[14px]" style={{ color: '#8a97a3' }}>
              {total} peminjaman aktif
              {archivedCount > 0 && ` · ${archivedCount.toLocaleString('id-ID')} di arsip`}
            </p>
          </div>
          {archivedCount > 0 && (
            <Link
              href="/peminjaman/arsip"
              className="hud-clip-sm inline-flex items-center gap-2 px-4 py-2.5 text-[12px] font-semibold transition"
              style={{ color: '#9bb3ff', border: '1px solid rgba(92,132,255,0.35)' }}
            >
              <Archive className="h-3.5 w-3.5" />
              LIHAT ARSIP
            </Link>
          )}
        </div>

        {/* Status tabs */}
        <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
          <div
            className="mb-[18px] inline-flex gap-1 p-[5px] hud-clip-md"
            style={{ border: '1px solid rgba(99,102,241,0.16)', background: 'rgba(255,255,255,0.02)' }}
          >
            {STATUS_TABS.map((tab) => {
              const active = status === tab.value
              const count = tab.value ? countMap[tab.value] : total
              return (
                <Link
                  key={tab.value}
                  href={`/peminjaman${buildQueryString({ status: tab.value, search, kelas: kelasFilter })}`}
                  className="whitespace-nowrap px-3 py-2 text-[13px] transition hud-clip-sm"
                  style={{
                    color: active ? '#fff' : '#6b7785',
                    fontWeight: active ? 600 : 400,
                    background: active ? 'rgba(92,132,255,0.14)' : 'transparent',
                  }}
                >
                  {tab.label}
                  {count !== undefined && (
                    <span
                      className="ml-1.5 inline-block rounded-full px-[6px] py-[1px] text-[11px]"
                      style={{ background: 'rgba(92,132,255,0.18)', color: '#9bb3ff' }}
                    >
                      {count}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Filter bar */}
        <form className="mb-[18px] flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1" style={{ minWidth: 220 }}>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: '#6b7785' }} />
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Cari nama siswa atau alat…"
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
            }}
          >
            <option value="">Semua Kelas</option>
            {distinctKelas.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          {status && <input type="hidden" name="status" value={status} />}
          <button
            type="submit"
            className="hud-clip-sm px-4 py-[9px] text-[12px] font-semibold transition"
            style={{ background: 'rgba(92,132,255,0.14)', color: '#9bb3ff', border: '1px solid rgba(92,132,255,0.35)' }}
          >
            CARI
          </button>
          {hasFilters && (
            <Link
              href={`/peminjaman${status ? `?status=${status}` : ''}`}
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
                href={`/peminjaman${buildQueryString({ status, search, kelas: '' })}`}
                className="hud-clip-sm inline-flex items-center gap-1 px-2.5 py-1 text-[12px]"
                style={{ background: 'rgba(92,132,255,0.14)', color: '#fff', border: '1px solid rgba(92,132,255,0.45)' }}
              >
                Kelas: {kelasFilter} <X className="h-3 w-3" />
              </Link>
            )}
            {search && (
              <Link
                href={`/peminjaman${buildQueryString({ status, search: '', kelas: kelasFilter })}`}
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
          <table className="w-full min-w-[680px] border-collapse">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(99,102,241,0.16)' }}>
                <th className="hud-label px-4 py-3 text-left text-[10px]" style={{ color: '#6b7785' }}>ID</th>
                <th className="hud-label px-4 py-3 text-left text-[10px]" style={{ color: '#6b7785' }}>Peminjam</th>
                <th className="hud-label px-4 py-3 text-left text-[10px]" style={{ color: '#6b7785' }}>Alat</th>
                <th className="hud-label px-4 py-3 text-left text-[10px]" style={{ color: '#6b7785' }}>Tanggal</th>
                <th className="hud-label px-4 py-3 text-left text-[10px]" style={{ color: '#6b7785' }}>Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {peminjamans.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid rgba(99,102,241,0.08)' }}>
                  <td className="px-4 py-3 text-[13px]" style={{ color: '#8a97a3' }}>#{p.id}</td>
                  <td className="px-4 py-3">
                    <p className="text-[14px] font-semibold" style={{ color: '#e8edf2' }}>{p.user.name}</p>
                    <p className="mt-px text-[12px]" style={{ color: '#6b7785' }}>{p.user.kelas ?? '-'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-[13.5px] line-clamp-1" style={{ color: '#c3ccd6' }}>
                      {p.details.map((d) => d.alat.nama).join(', ')}
                      {p.totalItems > p.details.length && ` +${p.totalItems - p.details.length} lainnya`}
                    </p>
                    <p className="mt-px text-[12px]" style={{ color: '#6b7785' }}>{p.totalItems} item</p>
                  </td>
                  <td className="px-4 py-3 text-[13px]" style={{ color: '#8a97a3' }}>{formatDate(p.tanggalPinjam)}</td>
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
              ))}
            </tbody>
          </table>
          {peminjamans.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12" style={{ color: '#6b7785' }}>
              <PackageCheck className="mb-2 h-10 w-10" />
              <p>{hasFilters ? 'Tidak ada peminjaman yang cocok dengan filter' : 'Tidak ada peminjaman'}</p>
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
                  href={`/peminjaman${buildQueryString({ status, search, kelas: kelasFilter, page: String(p) })}`}
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

  return (
    <div>
      <div className="mb-[18px] flex flex-wrap items-center justify-between gap-3 hud-rise">
        <div>
          <h1 className="hud-title" style={{ fontSize: 24 }}>Peminjaman Saya</h1>
          <p className="mt-1.5 text-[14px]" style={{ color: '#8a97a3' }}>{total} total peminjaman</p>
        </div>
        <Link
          href="/peminjaman/baru"
          className="hud-btn-primary inline-flex items-center gap-2 px-[22px] py-3 text-[12px]"
        >
          <Plus className="h-4 w-4" />
          BUAT PEMINJAMAN
        </Link>
      </div>

      {/* Status tabs */}
      <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <div
          className="mb-[18px] inline-flex gap-1 p-[5px] hud-clip-md"
          style={{ border: '1px solid rgba(99,102,241,0.16)', background: 'rgba(255,255,255,0.02)' }}
        >
          {STATUS_TABS.map((tab) => {
            const active = status === tab.value
            return (
              <Link
                key={tab.value}
                href={`/peminjaman${tab.value ? `?status=${tab.value}` : ''}`}
                className="whitespace-nowrap px-3 py-2 text-[13px] transition hud-clip-sm"
                style={{
                  color: active ? '#fff' : '#6b7785',
                  fontWeight: active ? 600 : 400,
                  background: active ? 'rgba(92,132,255,0.14)' : 'transparent',
                }}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Table */}
      <div className="hud-panel overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(99,102,241,0.16)' }}>
              <th className="hud-label px-4 py-3 text-left text-[10px]" style={{ color: '#6b7785' }}>ID</th>
              <th className="hud-label px-4 py-3 text-left text-[10px]" style={{ color: '#6b7785' }}>Alat</th>
              <th className="hud-label px-4 py-3 text-left text-[10px]" style={{ color: '#6b7785' }}>Tanggal</th>
              <th className="hud-label px-4 py-3 text-left text-[10px]" style={{ color: '#6b7785' }}>Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {peminjamans.map((p) => (
              <tr key={p.id} style={{ borderBottom: '1px solid rgba(99,102,241,0.08)' }}>
                <td className="px-4 py-3 text-[13px]" style={{ color: '#8a97a3' }}>#{p.id}</td>
                <td className="px-4 py-3">
                  <p className="text-[13.5px] line-clamp-1" style={{ color: '#e8edf2' }}>
                    {p.details.map((d) => d.alat.nama).join(', ')}
                    {p.totalItems > p.details.length && ` +${p.totalItems - p.details.length} lainnya`}
                  </p>
                  <p className="mt-px text-[12px]" style={{ color: '#6b7785' }}>{p.totalItems} item</p>
                </td>
                <td className="px-4 py-3 text-[13px]" style={{ color: '#8a97a3' }}>{formatDate(p.tanggalPinjam)}</td>
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
            ))}
          </tbody>
        </table>
        {peminjamans.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12" style={{ color: '#6b7785' }}>
            <PackageCheck className="mb-2 h-10 w-10" />
            <p>Tidak ada peminjaman</p>
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
                href={`/peminjaman?${new URLSearchParams({ ...(status && { status }), page: String(p) })}`}
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
