import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
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

  const roleLabel = user.role === 'siswa' ? 'Siswa' : user.role

  return (
    <div className="mx-auto max-w-[1120px]">
      <div className="mb-6 hud-rise">
        <h1 className="hud-title" style={{ fontSize: 24 }}>Profil Saya</h1>
        <p className="mt-1.5 text-[14px]" style={{ color: '#8a97a3' }}>
          Kelola data akun &amp; kelompok
        </p>
      </div>

      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', alignItems: 'start' }}
      >
        {/* account */}
        <div className="hud-panel hud-accent-top hud-rise p-[22px]">
          <div className="mb-5 flex items-center gap-3.5">
            <div
              className="hud-hex flex shrink-0 items-center justify-center"
              style={{
                width: 56,
                height: 56,
                background: 'linear-gradient(135deg, #2563eb, #9333ea)',
                fontFamily: 'var(--font-orbitron), sans-serif',
                fontSize: 22,
                fontWeight: 800,
                color: '#fff',
              }}
            >
              {user.name[0].toUpperCase()}
            </div>
            <div>
              <p className="text-[18px] font-bold" style={{ color: '#f0f4f8' }}>{user.name}</p>
              <p className="mt-1 text-[13px]" style={{ color: '#5c84ff' }}>{user.kelas ?? '-'}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex justify-between">
              <span className="text-[13.5px]" style={{ color: '#6b7785' }}>Nama</span>
              <span className="text-[13.5px]" style={{ color: '#e8edf2' }}>{user.name}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[13.5px]" style={{ color: '#6b7785' }}>Email</span>
              <span className="truncate text-[13.5px]" style={{ color: '#e8edf2' }}>{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[13.5px]" style={{ color: '#6b7785' }}>Kelas</span>
              <span className="text-[13.5px]" style={{ color: '#e8edf2' }}>{user.kelas ?? '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[13.5px]" style={{ color: '#6b7785' }}>Role</span>
              <span className="text-[13.5px] capitalize" style={{ color: '#e8edf2' }}>{roleLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[13.5px]" style={{ color: '#6b7785' }}>Status</span>
              <span className="text-[13.5px]" style={{ color: '#22c55e' }}>Aktif</span>
            </div>
          </div>
        </div>

        <ProfilForm kelompok={user.kelompok} anggota={anggota} />
      </div>
    </div>
  )
}
