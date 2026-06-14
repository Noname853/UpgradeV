import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { GlassCard } from '@/components/shared/GlassCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDate, formatDateTime } from '@/lib/utils'
import { ArrowLeft, Package, User, FileText } from 'lucide-react'
import Link from 'next/link'
import { PeminjamanActions } from './PeminjamanActions'

export default async function PeminjamanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numId = Number(id)
  if (!Number.isInteger(numId) || numId <= 0) notFound()

  const session = await auth()
  const isAdmin = session?.user.role === 'admin'
  const currentUserId = parseInt(session?.user.id ?? '0')

  const peminjaman = await prisma.peminjaman.findUnique({
    where: { id: numId },
    include: {
      user: { select: { id: true, name: true, email: true, kelas: true } },
      details: {
        include: { alat: { select: { id: true, nama: true, kode: true, kategori: true } } },
      },
    },
  })

  if (!peminjaman) notFound()
  if (!isAdmin && peminjaman.userId !== currentUserId) notFound()

  if (isAdmin) {
    return (
      <div className="mx-auto max-w-[1120px]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 hud-rise">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Link
              href="/peminjaman"
              className="flex h-[38px] w-[38px] items-center justify-center hud-clip-sm"
              style={{ color: '#8a97a3', border: '1px solid rgba(99,102,241,0.25)' }}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <h1 className="hud-title truncate" style={{ fontSize: 22 }}>Peminjaman #{peminjaman.id}</h1>
              <p className="mt-1 text-[13px]" style={{ color: '#8a97a3' }}>{formatDate(peminjaman.tanggalPinjam)}</p>
            </div>
          </div>
          <StatusBadge status={peminjaman.status} />
        </div>

        <div
          className="grid items-start gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}
        >
          <div className="space-y-3.5 lg:col-span-2" style={{ gridColumn: 'auto' }}>
            {/* Items */}
            <div className="hud-panel p-[22px]">
              <h2 className="hud-label mb-3.5 flex items-center gap-2 text-[11px]" style={{ color: '#c3ccd6' }}>
                <Package className="h-4 w-4" />
                Alat yang Dipinjam
              </h2>
              <div className="flex flex-col gap-2.5">
                {peminjaman.details.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between px-3.5 py-3 hud-clip-sm"
                    style={{ background: 'rgba(255,255,255,0.02)' }}
                  >
                    <div>
                      <Link href={`/alat/${d.alat.id}`} className="text-[14px] font-semibold" style={{ color: '#e8edf2' }}>
                        {d.alat.nama}
                      </Link>
                      <p className="mt-px text-[12px]" style={{ color: '#6b7785' }}>{d.alat.kode} · {d.alat.kategori}</p>
                    </div>
                    <span className="text-[13px]" style={{ color: '#c3ccd6' }}>{d.jumlah} unit</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Details */}
            <div className="hud-panel p-[22px]">
              <h2 className="hud-label mb-3.5 flex items-center gap-2 text-[11px]" style={{ color: '#c3ccd6' }}>
                <FileText className="h-4 w-4" />
                Detail
              </h2>
              <dl className="flex flex-col gap-[11px]">
                <div className="flex flex-wrap justify-between gap-3">
                  <dt className="text-[13.5px]" style={{ color: '#6b7785' }}>Keperluan</dt>
                  <dd className="text-[13.5px]" style={{ color: '#e8edf2' }}>{peminjaman.keperluan}</dd>
                </div>
                {peminjaman.catatan && (
                  <div className="flex flex-wrap justify-between gap-3">
                    <dt className="text-[13.5px]" style={{ color: '#6b7785' }}>Catatan</dt>
                    <dd className="text-[13.5px]" style={{ color: '#e8edf2' }}>{peminjaman.catatan}</dd>
                  </div>
                )}
                <div className="flex flex-wrap justify-between gap-3">
                  <dt className="text-[13.5px]" style={{ color: '#6b7785' }}>Tanggal Pinjam</dt>
                  <dd className="text-[13.5px]" style={{ color: '#e8edf2' }}>{formatDate(peminjaman.tanggalPinjam)}</dd>
                </div>
                {peminjaman.tanggalBatasKembali && (
                  <div className="flex flex-wrap justify-between gap-3">
                    <dt className="text-[13.5px]" style={{ color: '#6b7785' }}>Batas Kembali</dt>
                    <dd className="text-[13.5px]" style={{ color: '#e8edf2' }}>{formatDate(peminjaman.tanggalBatasKembali)}</dd>
                  </div>
                )}
                {peminjaman.tanggalVerifikasi && (
                  <div className="flex flex-wrap justify-between gap-3">
                    <dt className="text-[13.5px]" style={{ color: '#6b7785' }}>Diverifikasi</dt>
                    <dd className="text-[13.5px]" style={{ color: '#e8edf2' }}>{formatDateTime(peminjaman.tanggalVerifikasi)}</dd>
                  </div>
                )}
                {peminjaman.tanggalKembali && (
                  <div className="flex flex-wrap justify-between gap-3">
                    <dt className="text-[13.5px]" style={{ color: '#6b7785' }}>Dikembalikan</dt>
                    <dd className="text-[13.5px]" style={{ color: '#e8edf2' }}>{formatDateTime(peminjaman.tanggalKembali)}</dd>
                  </div>
                )}
                {peminjaman.alasanPembatalan && (
                  <div className="flex flex-wrap justify-between gap-3">
                    <dt className="text-[13.5px]" style={{ color: '#6b7785' }}>Alasan Batal</dt>
                    <dd className="text-[13.5px]" style={{ color: '#ef4444' }}>{peminjaman.alasanPembatalan}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          <div className="space-y-3.5">
            {/* Peminjam */}
            <div className="hud-panel p-5">
              <h2 className="hud-label mb-3.5 flex items-center gap-2 text-[11px]" style={{ color: '#c3ccd6' }}>
                <User className="h-4 w-4" />
                Peminjam
              </h2>
              <div className="flex items-center gap-3">
                <div
                  className="hud-hex flex h-[42px] w-[42px] items-center justify-center text-[16px] font-extrabold text-white"
                  style={{ fontFamily: 'var(--font-orbitron), sans-serif', background: 'linear-gradient(135deg, #2563eb, #9333ea)' }}
                >
                  {peminjaman.user.name[0]}
                </div>
                <div>
                  <p className="text-[14.5px] font-semibold" style={{ color: '#e8edf2' }}>{peminjaman.user.name}</p>
                  <p className="mt-px text-[12px]" style={{ color: '#6b7785' }}>{peminjaman.user.kelas ?? peminjaman.user.email}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <PeminjamanActions
              id={peminjaman.id}
              status={peminjaman.status}
              isAdmin={isAdmin}
              isOwner={peminjaman.userId === currentUserId}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link href="/peminjaman" className="rounded-lg border border-neutral-800 p-2 text-neutral-400 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-white sm:text-2xl">Peminjaman #{peminjaman.id}</h1>
            <p className="text-sm text-neutral-400">{formatDate(peminjaman.tanggalPinjam)}</p>
          </div>
        </div>
        <StatusBadge status={peminjaman.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {/* Items */}
          <GlassCard className="p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-neutral-300">
              <Package className="h-4 w-4" />
              Alat yang Dipinjam
            </h2>
            <div className="space-y-3">
              {peminjaman.details.map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded-lg bg-white/[0.02] px-4 py-3">
                  <div>
                    <Link href={`/alat/${d.alat.id}`} className="text-sm font-medium text-white hover:text-blue-400">
                      {d.alat.nama}
                    </Link>
                    <p className="text-xs text-neutral-500">{d.alat.kode} · {d.alat.kategori}</p>
                  </div>
                  <span className="text-sm text-neutral-300">{d.jumlah} unit</span>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Details */}
          <GlassCard className="p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-neutral-300">
              <FileText className="h-4 w-4" />
              Detail
            </h2>
            <dl className="space-y-3">
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-sm text-neutral-500">Keperluan</dt>
                <dd className="text-sm text-white">{peminjaman.keperluan}</dd>
              </div>
              {peminjaman.catatan && (
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-sm text-neutral-500">Catatan</dt>
                  <dd className="text-sm text-white">{peminjaman.catatan}</dd>
                </div>
              )}
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-sm text-neutral-500">Tanggal Pinjam</dt>
                <dd className="text-sm text-white">{formatDate(peminjaman.tanggalPinjam)}</dd>
              </div>
              {peminjaman.tanggalBatasKembali && (
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-sm text-neutral-500">Batas Kembali</dt>
                  <dd className="text-sm text-white">{formatDate(peminjaman.tanggalBatasKembali)}</dd>
                </div>
              )}
              {peminjaman.tanggalVerifikasi && (
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-sm text-neutral-500">Diverifikasi</dt>
                  <dd className="text-sm text-white">{formatDateTime(peminjaman.tanggalVerifikasi)}</dd>
                </div>
              )}
              {peminjaman.tanggalKembali && (
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-sm text-neutral-500">Dikembalikan</dt>
                  <dd className="text-sm text-white">{formatDateTime(peminjaman.tanggalKembali)}</dd>
                </div>
              )}
              {peminjaman.alasanPembatalan && (
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-sm text-neutral-500">Alasan Batal</dt>
                  <dd className="text-sm text-red-400">{peminjaman.alasanPembatalan}</dd>
                </div>
              )}
            </dl>
          </GlassCard>
        </div>

        <div className="space-y-4">
          {/* Peminjam */}
          <GlassCard className="p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-neutral-300">
              <User className="h-4 w-4" />
              Peminjam
            </h2>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-bold text-white">
                {peminjaman.user.name[0]}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{peminjaman.user.name}</p>
                <p className="text-xs text-neutral-500">{peminjaman.user.kelas ?? peminjaman.user.email}</p>
              </div>
            </div>
          </GlassCard>

          {/* Actions */}
          <PeminjamanActions
            id={peminjaman.id}
            status={peminjaman.status}
            isAdmin={isAdmin}
            isOwner={peminjaman.userId === currentUserId}
          />
        </div>
      </div>
    </div>
  )
}
