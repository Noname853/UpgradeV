import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { GlassCard } from '@/components/shared/GlassCard'
import { ArrowLeft, Users } from 'lucide-react'
import Link from 'next/link'

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user.role !== 'admin') redirect('/dashboard')

  const { id } = await params
  const numId = Number(id)
  if (!Number.isInteger(numId) || numId <= 0) notFound()

  const user = await prisma.user.findUnique({
    where: { id: numId },
    select: { name: true, email: true, kelas: true, role: true, kelompok: true, anggotaKelompok: true, isActive: true },
  })
  if (!user) notFound()

  let anggota: string[] = []
  if (user.anggotaKelompok) {
    try {
      const parsed = JSON.parse(user.anggotaKelompok)
      if (Array.isArray(parsed)) anggota = parsed
    } catch {}
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/users" className="rounded-lg border border-neutral-800 p-2 text-neutral-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Detail User</h1>
          <p className="text-sm text-neutral-400">{user.name}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-neutral-300">Informasi Akun</h2>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">Nama</span>
              <span className="text-white">{user.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">Email</span>
              <span className="text-white">{user.email}</span>
            </div>
            {user.kelas && (
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Kelas</span>
                <span className="text-white">{user.kelas}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">Role</span>
              <span className="text-white capitalize">{user.role}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">Status</span>
              <span className={user.isActive ? 'text-green-400' : 'text-neutral-500'}>
                {user.isActive ? 'Aktif' : 'Nonaktif'}
              </span>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-neutral-300">Kelompok</h2>
          </div>

          {user.kelompok ? (
            <p className="mb-3 text-sm font-medium text-white">{user.kelompok}</p>
          ) : (
            <p className="mb-3 text-sm text-neutral-600 italic">Belum ada nama kelompok</p>
          )}

          {anggota.length > 0 ? (
            <ul className="space-y-1.5">
              {anggota.map((nama, i) => (
                <li key={i} className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-white/[0.02] px-3 py-2 text-sm text-white">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/20 text-xs text-blue-400">
                    {i + 1}
                  </span>
                  {nama}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-neutral-600 italic">Belum ada anggota</p>
          )}
        </GlassCard>
      </div>
    </div>
  )
}
