import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDate, formatDateTime } from '@/lib/utils'
import { ArrowLeft, Package, User, FileText, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { PeminjamanActions } from './PeminjamanActions'
import { TandaiCatatanDibaca } from './TandaiCatatanDibaca'

// Catatan yang ditulis admin saat memproses pengembalian. Ditampilkan sebagai
// callout tersendiri (bukan baris di panel Detail) supaya terbaca oleh siswa —
// ini pesan untuk peminjam, bukan sekadar metadata. Aksen biru netral,
// dibedakan dari merah kerusakan karena isinya bisa apa saja termasuk pujian.
function CatatanPengembalian({ catatan }: { catatan: string }) {
  return (
    <div
      className="hud-panel p-[18px]"
      style={{ border: '1px solid rgba(92,132,255,0.35)', background: 'linear-gradient(160deg, rgba(92,132,255,0.08), rgba(255,255,255,0.01))' }}
    >
      <h2 className="hud-label mb-2 flex items-center gap-2 text-[11px]" style={{ color: '#5c84ff' }}>
        <MessageSquare className="h-4 w-4" />
        Catatan dari Admin saat Pengembalian
      </h2>
      <p className="text-[13.5px] leading-relaxed" style={{ color: '#e8edf2' }}>{catatan}</p>
    </div>
  )
}

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
        include: {
          unit: {
            select: {
              id: true,
              kode: true,
              kondisi: true,
              alat: { select: { id: true, nama: true, kategori: true } },
            },
          },
        },
      },
    },
  })

  if (!peminjaman) notFound()
  if (!isAdmin && peminjaman.userId !== currentUserId) notFound()

  if (isAdmin) {
    return (
      <div>
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
            {peminjaman.status === 'dikembalikan' && peminjaman.catatanPengembalian && (
              <CatatanPengembalian catatan={peminjaman.catatanPengembalian} />
            )}
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
                      <Link href={`/alat/${d.unit.alat.id}`} className="text-[14px] font-semibold" style={{ color: '#e8edf2' }}>
                        {d.unit.alat.nama}
                      </Link>
                      <p className="mt-px text-[12px]" style={{ color: '#6b7785' }}>{d.unit.alat.kategori}</p>
                      {d.keterangan && (
                        <p className="mt-1 text-[12px]" style={{ color: '#8a97a3' }}>Keterangan: {d.keterangan}</p>
                      )}
                      {d.kerusakan && (
                        <p className="mt-1 text-[12px] font-medium" style={{ color: '#ef4444' }}>Rusak: {d.kerusakan}</p>
                      )}
                    </div>
                    <span
                      className="hud-clip-sm px-2.5 py-1 text-[12px] font-bold"
                      style={{ fontFamily: 'var(--font-orbitron), sans-serif', color: '#4ade80', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)' }}
                    >
                      {d.unit.kode}
                    </span>
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
              units={peminjaman.details.map((d) => ({
                unitId: d.unit.id,
                kode: d.unit.kode,
                nama: d.unit.alat.nama,
              }))}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
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
            <p className="mt-1 text-[13px]" style={{ color: '#8a97a3' }}>Diajukan {formatDate(peminjaman.tanggalPinjam)}</p>
          </div>
        </div>
        <StatusBadge status={peminjaman.status} />
      </div>

      <div
        className="grid items-start gap-4"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}
      >
        <div className="space-y-3.5">
          {peminjaman.status === 'dikembalikan' && peminjaman.catatanPengembalian && (
            <CatatanPengembalian catatan={peminjaman.catatanPengembalian} />
          )}
          {/* Membuka detail = membaca catatan (umum maupun kerusakan per unit,
              yang tampil merah di kartu unit di bawah). */}
          {!isAdmin &&
            peminjaman.status === 'dikembalikan' &&
            !peminjaman.catatanDibacaAt &&
            (peminjaman.catatanPengembalian || peminjaman.details.some((d) => d.kerusakan)) && (
              <TandaiCatatanDibaca peminjamanId={peminjaman.id} />
            )}
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
                  className="flex items-center justify-between gap-3 px-3.5 py-3 hud-clip-sm"
                  style={{ border: '1px solid rgba(99,102,241,0.14)', background: 'rgba(255,255,255,0.02)' }}
                >
                  <div className="min-w-0">
                    <Link
                      href={`/alat/${d.unit.alat.id}`}
                      className="text-[14.5px] font-semibold"
                      style={{ color: '#e8edf2' }}
                    >
                      {d.unit.alat.nama}
                    </Link>
                    <p className="mt-px text-[12px]" style={{ color: '#6b7785' }}>{d.unit.alat.kategori}</p>
                    {d.kerusakan && (
                      <p className="mt-1 text-[12px] font-medium" style={{ color: '#ef4444' }}>Rusak: {d.kerusakan}</p>
                    )}
                  </div>
                  <span
                    className="hud-clip-sm shrink-0 px-2.5 py-1 text-[12px] font-bold"
                    style={{ fontFamily: 'var(--font-orbitron), sans-serif', color: '#4ade80', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)' }}
                  >
                    {d.unit.kode}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-[18px] pt-4" style={{ borderTop: '1px solid rgba(99,102,241,0.12)' }}>
              <p className="text-[12px]" style={{ color: '#6b7785' }}>Keperluan</p>
              <p className="mt-1.5 text-[14px] leading-relaxed" style={{ color: '#b3bdc7' }}>{peminjaman.keperluan}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3.5">
          {/* Info */}
          <div className="hud-panel p-5">
            <h2 className="hud-label mb-3.5 flex items-center gap-2 text-[11px]" style={{ color: '#c3ccd6' }}>
              <FileText className="h-4 w-4" />
              Informasi
            </h2>
            <div className="flex flex-col gap-[11px]">
              <div className="flex flex-wrap justify-between gap-3">
                <span className="text-[13.5px]" style={{ color: '#6b7785' }}>Tgl Pinjam</span>
                <span className="text-[13.5px]" style={{ color: '#e8edf2' }}>{formatDate(peminjaman.tanggalPinjam)}</span>
              </div>
              {peminjaman.tanggalBatasKembali && (
                <div className="flex flex-wrap justify-between gap-3">
                  <span className="text-[13.5px]" style={{ color: '#6b7785' }}>Batas Kembali</span>
                  <span className="text-[13.5px]" style={{ color: '#e8edf2' }}>{formatDate(peminjaman.tanggalBatasKembali)}</span>
                </div>
              )}
              {peminjaman.tanggalVerifikasi && (
                <div className="flex flex-wrap justify-between gap-3">
                  <span className="text-[13.5px]" style={{ color: '#6b7785' }}>Diverifikasi</span>
                  <span className="text-[13.5px]" style={{ color: '#e8edf2' }}>{formatDateTime(peminjaman.tanggalVerifikasi)}</span>
                </div>
              )}
              {peminjaman.tanggalKembali && (
                <div className="flex flex-wrap justify-between gap-3">
                  <span className="text-[13.5px]" style={{ color: '#6b7785' }}>Dikembalikan</span>
                  <span className="text-[13.5px]" style={{ color: '#e8edf2' }}>{formatDateTime(peminjaman.tanggalKembali)}</span>
                </div>
              )}
              {peminjaman.alasanPembatalan && (
                <div className="flex flex-wrap justify-between gap-3">
                  <span className="text-[13.5px]" style={{ color: '#6b7785' }}>Alasan Batal</span>
                  <span className="text-[13.5px]" style={{ color: '#ef4444' }}>{peminjaman.alasanPembatalan}</span>
                </div>
              )}
            </div>
            {peminjaman.catatan && (
              <div className="mt-4 pt-3.5" style={{ borderTop: '1px solid rgba(99,102,241,0.12)' }}>
                <p className="mb-1.5 text-[12px]" style={{ color: '#6b7785' }}>Catatan</p>
                <p className="text-[13px] leading-relaxed" style={{ color: '#b3bdc7' }}>{peminjaman.catatan}</p>
              </div>
            )}
          </div>

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
