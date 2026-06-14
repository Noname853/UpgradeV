import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
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

  if (isAdmin) {
    return (
      <div className="mx-auto max-w-[1120px]">
        <div className="mb-[18px] flex flex-wrap items-center justify-between gap-3 hud-rise">
          <div>
            <h1 className="hud-title" style={{ fontSize: 24 }}>Peminjaman</h1>
            <p className="mt-1.5 text-[14px]" style={{ color: '#8a97a3' }}>{total} peminjaman</p>
          </div>
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

  return (
    <div className="mx-auto max-w-[1120px]">
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
