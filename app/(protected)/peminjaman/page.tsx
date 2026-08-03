import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/lib/generated/prisma/client'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDate } from '@/lib/utils'
import { Plus, PackageCheck, Search, Archive, X, Users } from 'lucide-react'
import Link from 'next/link'
import { ScanPengembalianButton } from '@/components/peminjaman/ScanPengembalianButton'
import { PeminjamanSheetList } from '@/components/peminjaman/PeminjamanSheetList'
import { Pagination } from '@/components/shared/Pagination'
import { StatusPoller } from '@/components/peminjaman/StatusPoller'

const STATUS_TABS = [
  { label: 'Semua', value: '' },
  { label: 'Menunggu', value: 'menunggu_verifikasi' },
  { label: 'Dipinjam', value: 'dipinjam' },
  { label: 'Dikembalikan', value: 'dikembalikan' },
  { label: 'Dibatalkan', value: 'dibatalkan' },
]

// Filter cepat per tingkat. `prefixes` mencocokkan awalan kolom kelas untuk
// dua format yang dipakai di lapangan: angka biasa ("12 TKJ A") maupun angka
// Romawi ("XII TKJ 1"). Awalan diuji dengan spasi setelahnya agar "11"/"XI"
// tidak ikut menangkap "12"/"XII".
const TINGKAT_OPTIONS: { label: string; value: string; prefixes: string[] }[] = [
  { label: 'Semua', value: '', prefixes: [] },
  { label: 'Kelas 10', value: '10', prefixes: ['10', 'X'] },
  { label: 'Kelas 11', value: '11', prefixes: ['11', 'XI'] },
  { label: 'Kelas 12', value: '12', prefixes: ['12', 'XII'] },
]

const ARCHIVE_DAYS = 30

interface SearchParams {
  status?: string
  page?: string
  search?: string
  kelas?: string
  tingkat?: string
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
  const tingkat = sp.tingkat ?? ''
  const tingkatPrefixes = TINGKAT_OPTIONS.find((t) => t.value && t.value === tingkat)?.prefixes ?? []
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

  // Kondisi pencarian & filter kelas/tingkat dikumpulkan sebagai AND agar
  // beberapa syarat pada relasi `user` tidak saling menimpa.
  const filterConditions: Prisma.PeminjamanWhereInput[] = []
  if (search) {
    filterConditions.push({
      OR: [
        { user: { name: { contains: search } } },
        { details: { some: { unit: { alat: { nama: { contains: search } } } } } },
      ],
    })
  }
  if (kelasFilter) {
    filterConditions.push({ user: { kelas: kelasFilter } })
  }
  if (tingkatPrefixes.length) {
    filterConditions.push({
      user: {
        OR: tingkatPrefixes.flatMap((p) => [
          { kelas: p },
          { kelas: { startsWith: `${p} ` } },
        ]),
      },
    })
  }

  const where: Prisma.PeminjamanWhereInput = {
    ...(isAdmin ? {} : { userId, disembunyikanSiswa: false }),
    ...(status ? { status } : {}),
    ...(isAdmin ? activeCondition : {}),
    ...(filterConditions.length ? { AND: filterConditions } : {}),
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
          include: { unit: { select: { kode: true, alat: { select: { nama: true } } } } },
        },
      },
    }),
    prisma.peminjaman.count({ where }),
    isAdmin
      ? prisma.peminjaman.count({ where: archiveCondition })
      : Promise.resolve(0),
    isAdmin
      ? prisma.user.findMany({
          // Ambil kelas yang benar-benar punya peminjaman agar dropdown selalu
          // mencerminkan data yang ada (tidak dibatasi role/isActive).
          where: { kelas: { not: null }, peminjamans: { some: {} } },
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
                ...(filterConditions.length ? { AND: filterConditions } : {}),
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

  const tingkatLabel = TINGKAT_OPTIONS.find((t) => t.value === tingkat && t.value)?.label
  const hasFilters = search || kelasFilter || tingkat

  // Data ringkas untuk kartu + bottom sheet detail (mobile).
  const sheetItems = peminjamans.map((p) => ({
    id: p.id,
    status: p.status,
    userName: p.user.name,
    userKelas: p.user.kelas,
    alatLabel:
      p.details.map((d) => d.unit.alat.nama).join(', ') +
      (p.totalItems > p.details.length ? ` +${p.totalItems - p.details.length} lainnya` : ''),
    totalItems: p.totalItems,
    tanggalPinjam: p.tanggalPinjam.toISOString(),
    tanggalKembali: p.tanggalKembali ? p.tanggalKembali.toISOString() : null,
    tanggalBatasKembali: p.tanggalBatasKembali ? p.tanggalBatasKembali.toISOString() : null,
    catatanAdmin: p.catatanPengembalian ?? null,
  }))

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
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="hidden md:block">
              <ScanPengembalianButton />
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
        </div>

        {/* Status tabs — mobile: chip scroll */}
        <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 md:hidden">
          {STATUS_TABS.map((tab) => {
            const active = status === tab.value
            const count = tab.value ? countMap[tab.value] : total
            return (
              <Link
                key={tab.value}
                href={`/peminjaman${buildQueryString({ status: tab.value, search, kelas: kelasFilter, tingkat })}`}
                className="hud-clip-sm flex-none whitespace-nowrap px-3 py-2 text-[12px] font-semibold"
                style={active ? { color: '#fff', background: 'linear-gradient(135deg,#2563eb,#9333ea)' } : { color: '#8a97a3', border: '1px solid rgba(99,102,241,0.2)' }}
              >
                {tab.label}
                {count !== undefined && (
                  <span className="ml-1.5" style={{ color: active ? 'rgba(255,255,255,0.85)' : '#9bb3ff', fontWeight: 700 }}>{count}</span>
                )}
              </Link>
            )
          })}
        </div>

        {/* Status tabs — desktop */}
        <div className="hidden md:block">
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
                  href={`/peminjaman${buildQueryString({ status: tab.value, search, kelas: kelasFilter, tingkat })}`}
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

        {/* Filter kelas — mobile: chip ringkas */}
        <div className="mb-4 flex items-center gap-2 md:hidden">
          <span className="flex flex-none items-center gap-1 text-[11px]" style={{ color: '#6b7785' }}>
            <Users className="h-3.5 w-3.5" /> Kelas
          </span>
          <div className="flex gap-1.5 overflow-x-auto">
            {TINGKAT_OPTIONS.map((opt) => {
              const active = tingkat === opt.value
              return (
                <Link
                  key={opt.value || 'all'}
                  href={`/peminjaman${buildQueryString({ status, search, kelas: kelasFilter, tingkat: opt.value })}`}
                  className="flex-none whitespace-nowrap rounded-full px-3 py-1.5 text-[12px] font-semibold"
                  style={active ? { color: '#fff', background: 'rgba(92,132,255,0.18)', border: '1px solid rgba(92,132,255,0.5)' } : { color: '#8a97a3', border: '1px solid rgba(99,102,241,0.2)' }}
                >
                  {opt.label.replace('Kelas ', '')}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Filter cepat per tingkat (10 / 11 / 12) — desktop */}
        <div className="mb-[18px] hidden md:block">
          <span
            className="hud-label mb-2 block text-[10px]"
            style={{ color: '#6b7785', letterSpacing: '1.5px' }}
          >
            TINGKAT
          </span>
          <div
            className="grid grid-cols-4 gap-1 p-[4px] hud-clip-md md:inline-flex"
            style={{ border: '1px solid rgba(99,102,241,0.28)', background: 'rgba(255,255,255,0.02)' }}
          >
            {TINGKAT_OPTIONS.map((opt) => {
              const active = tingkat === opt.value
              return (
                <Link
                  key={opt.value || 'all'}
                  href={`/peminjaman${buildQueryString({ status, search, kelas: kelasFilter, tingkat: opt.value })}`}
                  className="block w-full whitespace-nowrap px-2 py-[7px] text-center text-[12.5px] transition hud-clip-sm md:w-auto md:px-4 md:text-[13px]"
                  style={{
                    color: active ? '#fff' : '#8a97a3',
                    fontWeight: active ? 600 : 400,
                    background: active
                      ? 'linear-gradient(135deg, rgba(37,99,235,0.55), rgba(147,51,234,0.45))'
                      : 'transparent',
                  }}
                >
                  {opt.label}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Filter bar — desktop saja */}
        <form className="mb-[18px] hidden flex-wrap items-center gap-2.5 md:flex">
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
            className="hud-clip-sm flex-1 py-[9px] px-3 text-[13.5px] outline-none md:flex-none"
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
          {status && <input type="hidden" name="status" value={status} />}
          {tingkat && <input type="hidden" name="tingkat" value={tingkat} />}
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

        {/* Active filter chips — desktop saja */}
        {hasFilters && (
          <div className="mb-3 hidden flex-wrap items-center gap-2 md:flex">
            <span className="hud-label text-[10px]" style={{ color: '#6b7785', letterSpacing: '1.5px' }}>FILTER AKTIF:</span>
            {tingkatLabel && (
              <Link
                href={`/peminjaman${buildQueryString({ status, search, kelas: kelasFilter, tingkat: '' })}`}
                className="hud-clip-sm inline-flex items-center gap-1 px-2.5 py-1 text-[12px]"
                style={{ background: 'rgba(92,132,255,0.14)', color: '#fff', border: '1px solid rgba(92,132,255,0.45)' }}
              >
                Tingkat: {tingkatLabel} <X className="h-3 w-3" />
              </Link>
            )}
            {kelasFilter && (
              <Link
                href={`/peminjaman${buildQueryString({ status, search, kelas: '', tingkat })}`}
                className="hud-clip-sm inline-flex items-center gap-1 px-2.5 py-1 text-[12px]"
                style={{ background: 'rgba(92,132,255,0.14)', color: '#fff', border: '1px solid rgba(92,132,255,0.45)' }}
              >
                Kelas: {kelasFilter} <X className="h-3 w-3" />
              </Link>
            )}
            {search && (
              <Link
                href={`/peminjaman${buildQueryString({ status, search: '', kelas: kelasFilter, tingkat })}`}
                className="hud-clip-sm inline-flex items-center gap-1 px-2.5 py-1 text-[12px]"
                style={{ background: 'rgba(92,132,255,0.14)', color: '#fff', border: '1px solid rgba(92,132,255,0.45)' }}
              >
                &ldquo;{search}&rdquo; <X className="h-3 w-3" />
              </Link>
            )}
          </div>
        )}

        {/* Mobile: kartu + bottom sheet detail */}
        <PeminjamanSheetList items={sheetItems} isAdmin />

        {/* Desktop: tabel */}
        <div className="hidden hud-panel overflow-x-auto md:block">
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
                      {p.details.map((d) => d.unit.alat.nama).join(', ')}
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

        <Pagination
          page={page}
          pages={pages}
          hrefs={Array.from(
            { length: pages },
            (_, i) => `/peminjaman${buildQueryString({ status, search, kelas: kelasFilter, tingkat, page: String(i + 1) })}`,
          )}
        />
      </div>
    )
  }

  return (
    <div>
      <StatusPoller />
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

      {/* Mobile: kartu + bottom sheet detail */}
      <PeminjamanSheetList items={sheetItems} isAdmin={false} />

      {/* Desktop: tabel */}
      <div className="hidden hud-panel overflow-x-auto md:block">
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
                    {p.details.map((d) => d.unit.alat.nama).join(', ')}
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

      <Pagination
        page={page}
        pages={pages}
        hrefs={Array.from(
          { length: pages },
          (_, i) => `/peminjaman?${new URLSearchParams({ ...(status && { status }), page: String(i + 1) })}`,
        )}
      />
    </div>
  )
}
