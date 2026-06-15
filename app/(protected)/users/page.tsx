import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { Users, Plus, Search } from 'lucide-react'
import Link from 'next/link'
import { DeleteUserButton } from './DeleteUserButton'

interface SearchParams {
  search?: string
  page?: string
  all?: string
}

export default async function UsersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await auth()
  if (session?.user.role !== 'admin') redirect('/dashboard')

  const sp = await searchParams
  const search = sp.search ?? ''
  const showAll = sp.all === 'true'
  const page = parseInt(sp.page ?? '1')
  const limit = 10

  const where = {
    role: 'siswa',
    ...(showAll ? {} : { isActive: true }),
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
            { kelas: { contains: search } },
          ],
        }
      : {}),
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, role: true, kelas: true, kelompok: true, createdAt: true, isActive: true },
    }),
    prisma.user.count({ where }),
  ])

  const pages = Math.ceil(total / limit)

  const buildHref = (overrides: Record<string, string>) => {
    const params = new URLSearchParams({
      ...(search && { search }),
      ...(showAll && { all: 'true' }),
      page: String(page),
      ...overrides,
    })
    return `/users?${params}`
  }

  const thStyle = {
    fontFamily: 'var(--font-orbitron), sans-serif',
    fontWeight: 700,
    letterSpacing: 1.5,
    color: '#6b7785',
  }

  return (
    <div>
      <div className="mb-[18px] flex flex-wrap items-center justify-between gap-3 hud-rise">
        <div>
          <h1 className="hud-title" style={{ fontSize: 24 }}>Manajemen User</h1>
          <p className="mt-1.5 text-[14px]" style={{ color: '#8a97a3' }}>
            {total} pengguna {showAll ? 'total' : 'aktif'}
          </p>
        </div>
        <Link
          href="/users/baru"
          className="hud-btn-primary flex items-center gap-2 px-[18px] py-2.5 text-[12px]"
        >
          <Plus className="h-4 w-4" />
          Tambah User
        </Link>
      </div>

      <div className="mb-[18px] flex flex-col gap-3 sm:flex-row sm:items-stretch hud-rise">
        <form className="flex flex-1 flex-wrap gap-[11px]">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: '#6b7785' }} />
            <input
              name="search"
              defaultValue={search}
              placeholder="Cari nama, email, atau kelas..."
              className="hud-input w-full py-[11px] pl-9 pr-3 text-[14px]"
            />
            {showAll && <input type="hidden" name="all" value="true" />}
          </div>
          <button type="submit" className="hud-btn-ghost px-[22px] py-[11px] text-[12px]">
            Cari
          </button>
          {search && (
            <Link
              href={`/users${showAll ? '?all=true' : ''}`}
              className="hud-clip-sm px-[18px] py-[11px] text-[13.5px] transition"
              style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)' }}
            >
              Reset
            </Link>
          )}
        </form>
        <Link
          href={buildHref({ all: showAll ? '' : 'true', page: '1' }).replace('all=&', '').replace('?all=&', '?')}
          className="hud-clip-sm whitespace-nowrap px-[18px] py-[11px] text-[13.5px] transition"
          style={
            showAll
              ? { color: '#5c84ff', border: '1px solid rgba(92,132,255,0.4)' }
              : { color: '#8a97a3', border: '1px solid rgba(99,102,241,0.25)' }
          }
        >
          {showAll ? 'Semua (termasuk nonaktif)' : 'Hanya aktif'}
        </Link>
      </div>

      <div className="hud-panel hud-rise overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(99,102,241,0.16)' }}>
                <th className="px-4 py-[13px] text-left text-[10px]" style={thStyle}>NAMA</th>
                <th className="px-4 py-[13px] text-left text-[10px]" style={thStyle}>ROLE</th>
                <th className="px-4 py-[13px] text-left text-[10px]" style={thStyle}>KELAS</th>
                <th className="px-4 py-[13px] text-left text-[10px]" style={thStyle}>TERDAFTAR</th>
                <th className="px-4 py-[13px]"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  style={{ borderBottom: '1px solid rgba(99,102,241,0.08)', opacity: u.isActive ? 1 : 0.5 }}
                >
                  <td className="px-4 py-[13px]">
                    <div className="flex items-center gap-[11px]">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{
                          background: u.isActive
                            ? 'linear-gradient(135deg, #3b82f6, #9333ea)'
                            : 'rgba(255,255,255,0.08)',
                        }}
                      >
                        {u.name[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-[14px] font-semibold" style={{ color: '#e8edf2' }}>{u.name}</p>
                          {!u.isActive && (
                            <span
                              className="rounded-full px-2 py-0.5 text-[11px]"
                              style={{ color: '#8a97a3', background: 'rgba(255,255,255,0.06)' }}
                            >
                              Nonaktif
                            </span>
                          )}
                        </div>
                        <p className="mt-px text-[12px]" style={{ color: '#6b7785' }}>{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-[13px]">
                    <span
                      className="inline-flex rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold"
                      style={
                        u.role === 'admin'
                          ? { color: '#5c84ff', background: 'rgba(92,132,255,0.12)' }
                          : { color: '#8a97a3', background: 'rgba(99,102,241,0.1)' }
                      }
                    >
                      {u.role === 'admin' ? 'Admin' : 'Siswa'}
                    </span>
                  </td>
                  <td className="px-4 py-[13px] text-[13px]" style={{ color: '#8a97a3' }}>{u.kelas ?? '-'}</td>
                  <td className="px-4 py-[13px] text-[13px]" style={{ color: '#8a97a3' }}>{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-[13px]">
                    <div className="flex justify-end gap-[13px]">
                      <Link
                        href={`/users/${u.id}/detail`}
                        className="text-[12.5px] transition"
                        style={{ color: '#8a97a3' }}
                      >
                        Detail
                      </Link>
                      <Link
                        href={`/users/${u.id}/edit`}
                        className="text-[12.5px] transition"
                        style={{ color: '#8a97a3' }}
                      >
                        Edit
                      </Link>
                      <DeleteUserButton id={u.id} isActive={u.isActive} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12" style={{ color: '#6b7785' }}>
            <Users className="mb-2 h-10 w-10" />
            <p>Tidak ada user ditemukan</p>
          </div>
        )}
      </div>

      {pages > 1 && (
        <div className="mt-[18px] flex justify-center gap-2">
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
