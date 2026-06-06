import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { GlassCard } from '@/components/shared/GlassCard'
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
    ...(search ? { OR: [{ name: { contains: search } }, { email: { contains: search } }] } : {}),
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Manajemen User</h1>
          <p className="text-sm text-neutral-400">{total} pengguna {showAll ? 'total' : 'aktif'}</p>
        </div>
        <Link
          href="/users/baru"
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:from-blue-500 hover:to-purple-500"
        >
          <Plus className="h-4 w-4" />
          Tambah User
        </Link>
      </div>

      <GlassCard className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <form className="flex flex-1 gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
              <input
                name="search"
                defaultValue={search}
                placeholder="Cari nama atau email..."
                className="w-full rounded-lg border border-neutral-700 bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-white placeholder-neutral-600 outline-none focus:border-blue-500"
              />
              {showAll && <input type="hidden" name="all" value="true" />}
            </div>
            <button
              type="submit"
              className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:text-white"
            >
              Cari
            </button>
          </form>
          <Link
            href={buildHref({ all: showAll ? '' : 'true', page: '1' }).replace('all=&', '').replace('?all=&', '?')}
            className={`rounded-lg border px-4 py-2 text-sm whitespace-nowrap transition ${
              showAll
                ? 'border-blue-500 text-blue-400'
                : 'border-neutral-700 text-neutral-400 hover:text-white'
            }`}
          >
            {showAll ? 'Semua (termasuk nonaktif)' : 'Hanya aktif'}
          </Link>
        </div>
      </GlassCard>

      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-neutral-800 text-left">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">Nama</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">Role</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">Kelas</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">Terdaftar</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {users.map((u) => (
                <tr key={u.id} className={`transition hover:bg-white/[0.02] ${!u.isActive ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ${
                        u.isActive
                          ? 'bg-gradient-to-br from-blue-500 to-purple-600'
                          : 'bg-neutral-700'
                      }`}>
                        {u.name[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-white">{u.name}</p>
                          {!u.isActive && (
                            <span className="rounded-full bg-neutral-700 px-2 py-0.5 text-xs text-neutral-400">
                              Nonaktif
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      u.role === 'admin'
                        ? 'bg-blue-500/10 text-blue-400'
                        : 'bg-neutral-700/50 text-neutral-400'
                    }`}>
                      {u.role === 'admin' ? 'Admin' : 'Siswa'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-400">{u.kelas ?? '-'}</td>
                  <td className="px-4 py-3 text-sm text-neutral-400">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-3">
                      <Link href={`/users/${u.id}/detail`} className="text-xs text-neutral-400 hover:text-blue-400">
                        Detail
                      </Link>
                      <Link href={`/users/${u.id}/edit`} className="text-xs text-neutral-400 hover:text-white">
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
          <div className="flex flex-col items-center justify-center py-12 text-neutral-600">
            <Users className="mb-2 h-10 w-10" />
            <p>Tidak ada user ditemukan</p>
          </div>
        )}
      </GlassCard>

      {pages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={buildHref({ page: String(p) })}
              className={`rounded-lg px-3 py-1.5 text-sm ${
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
