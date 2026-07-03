import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { ArrowLeft, Users, AlertTriangle } from 'lucide-react'
import { formatDate } from '@/lib/utils'
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

  // Riwayat kerusakan: unit yang ditandai rusak saat peminjaman milik user ini.
  const kerusakan = await prisma.peminjamanDetail.findMany({
    where: { kerusakan: { not: null }, peminjaman: { userId: numId } },
    select: {
      id: true,
      kerusakan: true,
      unit: { select: { kode: true, alat: { select: { nama: true } } } },
      peminjaman: { select: { id: true, tanggalKembali: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  let anggota: string[] = []
  if (user.anggotaKelompok) {
    try {
      const parsed = JSON.parse(user.anggotaKelompok)
      if (Array.isArray(parsed)) anggota = parsed
    } catch {}
  }

  return (
    <div>
      <div className="mb-5 flex items-center gap-3 hud-rise">
        <Link
          href="/users"
          className="hud-clip-sm flex h-[38px] w-[38px] items-center justify-center"
          style={{ color: '#8a97a3', border: '1px solid rgba(99,102,241,0.25)' }}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="hud-title" style={{ fontSize: 22 }}>Detail User</h1>
          <p className="mt-1 text-[13px]" style={{ color: '#8a97a3' }}>{user.name}</p>
        </div>
      </div>

      <div className="grid items-start gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        <div className="hud-panel hud-accent-top hud-rise p-[22px]">
          <h2 className="hud-label mb-4 text-[11px]" style={{ color: '#c3ccd6' }}>Informasi Akun</h2>
          <div className="flex flex-col gap-3">
            <div className="flex justify-between text-[13.5px]">
              <span style={{ color: '#6b7785' }}>Nama</span>
              <span style={{ color: '#e8edf2' }}>{user.name}</span>
            </div>
            <div className="flex justify-between text-[13.5px]">
              <span style={{ color: '#6b7785' }}>Email</span>
              <span style={{ color: '#e8edf2' }}>{user.email}</span>
            </div>
            {user.kelas && (
              <div className="flex justify-between text-[13.5px]">
                <span style={{ color: '#6b7785' }}>Kelas</span>
                <span style={{ color: '#e8edf2' }}>{user.kelas}</span>
              </div>
            )}
            <div className="flex justify-between text-[13.5px]">
              <span style={{ color: '#6b7785' }}>Role</span>
              <span className="capitalize" style={{ color: '#e8edf2' }}>{user.role}</span>
            </div>
            <div className="flex justify-between text-[13.5px]">
              <span style={{ color: '#6b7785' }}>Status</span>
              <span style={{ color: user.isActive ? '#22c55e' : '#6b7785' }}>
                {user.isActive ? 'Aktif' : 'Nonaktif'}
              </span>
            </div>
          </div>
        </div>

        <div className="hud-panel hud-accent-top hud-rise p-[22px]">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-4 w-4" style={{ color: '#5c84ff' }} />
            <h2 className="hud-label text-[11px]" style={{ color: '#c3ccd6' }}>Kelompok</h2>
          </div>

          {user.kelompok ? (
            <p className="mb-3 text-[14px] font-semibold" style={{ color: '#e8edf2' }}>{user.kelompok}</p>
          ) : (
            <p className="mb-3 text-[14px] italic" style={{ color: '#6b7785' }}>Belum ada nama kelompok</p>
          )}

          {anggota.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {anggota.map((nama, i) => (
                <li
                  key={i}
                  className="hud-clip-sm flex items-center gap-2.5 px-3 py-2 text-[13.5px]"
                  style={{ color: '#e8edf2', border: '1px solid rgba(99,102,241,0.14)', background: 'rgba(255,255,255,0.02)' }}
                >
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded-full text-[11px]"
                    style={{ color: '#5c84ff', background: 'rgba(92,132,255,0.18)' }}
                  >
                    {i + 1}
                  </span>
                  {nama}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13.5px] italic" style={{ color: '#6b7785' }}>Belum ada anggota</p>
          )}
        </div>

        <div className="hud-panel hud-accent-top hud-rise p-[22px]">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" style={{ color: kerusakan.length > 0 ? '#ef4444' : '#5c84ff' }} />
            <h2 className="hud-label text-[11px]" style={{ color: '#c3ccd6' }}>Riwayat Kerusakan</h2>
            {kerusakan.length > 0 && (
              <span
                className="hud-clip-sm px-1.5 py-0.5 text-[11px] font-bold"
                style={{ color: '#ef4444', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}
              >
                {kerusakan.length}
              </span>
            )}
          </div>

          {kerusakan.length === 0 ? (
            <p className="text-[13.5px] italic" style={{ color: '#6b7785' }}>Tidak ada riwayat kerusakan</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {kerusakan.map((k) => (
                <li
                  key={k.id}
                  className="hud-clip-sm px-3 py-2.5"
                  style={{ border: '1px solid rgba(239,68,68,0.18)', background: 'rgba(239,68,68,0.04)' }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[13.5px] font-semibold" style={{ color: '#e8edf2' }}>
                      {k.unit.alat.nama}
                    </span>
                    <span
                      className="hud-clip-sm px-1.5 py-0.5 text-[11px] font-bold"
                      style={{ fontFamily: 'var(--font-orbitron), sans-serif', color: '#f87171', background: 'rgba(239,68,68,0.12)' }}
                    >
                      {k.unit.kode}
                    </span>
                  </div>
                  {k.kerusakan && k.kerusakan !== 'Rusak' && (
                    <p className="mt-1 text-[12.5px]" style={{ color: '#b3bdc7' }}>{k.kerusakan}</p>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11.5px]" style={{ color: '#6b7785' }}>
                    <Link href={`/peminjaman/${k.peminjaman.id}`} style={{ color: '#5c84ff' }}>
                      Peminjaman #{k.peminjaman.id}
                    </Link>
                    {k.peminjaman.tanggalKembali && <span>· {formatDate(k.peminjaman.tanggalKembali)}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
