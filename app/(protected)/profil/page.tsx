import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { GlassCard } from '@/components/shared/GlassCard'
import { ProfilForm } from './ProfilForm'

export default async function ProfilPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: parseInt(session.user.id) },
    select: { name: true, email: true, kelas: true, role: true, kelompok: true, anggotaKelompok: true },
  })
  if (!user) redirect('/login')

  let anggota: string[] = []
  if (user.anggotaKelompok) {
    try {
      const parsed = JSON.parse(user.anggotaKelompok)
      if (Array.isArray(parsed)) anggota = parsed
    } catch {}
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Profil</h1>
        <p className="text-sm text-neutral-400">Informasi akun dan kelompok kamu</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard className="p-5">
          {/* Header */}
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-lg font-bold text-white">
              {user.name[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Informasi Akun</h2>
              <p className="text-xs text-neutral-500">Detail data diri siswa aktif</p>
            </div>
          </div>

          {/* Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-white/[0.04] p-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">Nama</p>
              <p className="text-sm font-medium text-white">{user.name}</p>
            </div>
            <div className="rounded-lg bg-white/[0.04] p-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">Kelas</p>
              <p className="text-sm font-medium text-white">{user.kelas ?? '-'}</p>
            </div>
            <div className="col-span-2 rounded-lg bg-white/[0.04] p-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">Email</p>
              <p className="text-sm font-medium text-blue-400">{user.email}</p>
            </div>
            <div className="col-span-2 rounded-lg bg-white/[0.04] p-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">Role</p>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white capitalize">{user.role === 'siswa' ? 'Siswa' : user.role}</p>
                <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
              </div>
            </div>
          </div>
        </GlassCard>

        <ProfilForm kelompok={user.kelompok} anggota={anggota} />
      </div>
    </div>
  )
}
