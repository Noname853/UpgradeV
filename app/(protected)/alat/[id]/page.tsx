import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { StockBadge } from '@/components/shared/StockBadge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDate } from '@/lib/utils'
import { MapPin, Calendar, ArrowLeft, Pencil, ImageIcon } from 'lucide-react'
import Link from 'next/link'
import { DeleteAlatButton } from './DeleteAlatButton'

export default async function AlatDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numId = Number(id)
  if (!Number.isInteger(numId) || numId <= 0) notFound()

  const session = await auth()
  const isAdmin = session?.user.role === 'admin'

  const alat = await prisma.alat.findUnique({
    where: { id: numId },
    include: {
      peminjamanDetails: {
        where: { peminjaman: { status: { in: ['menunggu_verifikasi', 'dipinjam'] } } },
        include: {
          peminjaman: {
            include: { user: { select: { name: true } } },
          },
        },
      },
    },
  })

  if (!alat) notFound()

  const dipinjam = alat.peminjamanDetails.reduce((s, d) => s + d.jumlah, 0)
  const stokTersedia = alat.stok - dipinjam

  if (isAdmin) {
    return (
      <div>
        {/* header */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 hud-rise">
          <div className="flex items-center gap-3">
            <Link
              href="/alat"
              className="hud-clip-sm flex h-[38px] w-[38px] items-center justify-center"
              style={{ color: '#8a97a3', border: '1px solid rgba(99,102,241,0.25)' }}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="hud-title" style={{ fontSize: 22 }}>{alat.nama}</h1>
              <p className="mt-1 text-[13px]" style={{ color: '#8a97a3' }}>{alat.kode}</p>
            </div>
          </div>
          <div className="flex gap-2.5">
            <Link
              href={`/alat/${alat.id}/edit`}
              className="hud-btn-ghost flex items-center gap-2 px-4 py-2.5 text-[12px]"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
            <DeleteAlatButton id={alat.id} />
          </div>
        </div>

        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          <div className="lg:col-span-2" style={{ gridColumn: 'span 2 / span 2' }}>
            <div className="hud-panel hud-accent-top hud-rise p-[22px]">
              <h2 className="hud-label mb-[18px] text-[12px]" style={{ color: '#c3ccd6' }}>Informasi Alat</h2>
              <dl className="grid grid-cols-2 gap-[18px]">
                <div>
                  <dt className="text-xs" style={{ color: '#6b7785' }}>Kategori</dt>
                  <dd className="mt-1 text-[15px]" style={{ color: '#e8edf2' }}>{alat.kategori}</dd>
                </div>
                <div>
                  <dt className="text-xs" style={{ color: '#6b7785' }}>Lokasi</dt>
                  <dd className="mt-1 flex items-center gap-1 text-[15px]" style={{ color: '#e8edf2' }}>
                    <MapPin className="h-3.5 w-3.5" style={{ color: '#6b7785' }} />
                    {alat.lokasi || '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs" style={{ color: '#6b7785' }}>Total Stok</dt>
                  <dd className="mt-1 text-[15px]" style={{ color: '#e8edf2' }}>{alat.stok} unit</dd>
                </div>
                <div>
                  <dt className="text-xs" style={{ color: '#6b7785' }}>Stok Tersedia</dt>
                  <dd className="mt-1.5">
                    <StockBadge stok={alat.stok} stokTersedia={stokTersedia} />
                  </dd>
                </div>
                {alat.tanggalEos && (
                  <div>
                    <dt className="text-xs" style={{ color: '#6b7785' }}>End of Support</dt>
                    <dd className="mt-1 flex items-center gap-1 text-[15px]" style={{ color: '#e8edf2' }}>
                      <Calendar className="h-3.5 w-3.5" style={{ color: '#6b7785' }} />
                      {formatDate(alat.tanggalEos)}
                    </dd>
                  </div>
                )}
                {alat.tanggalEol && (
                  <div>
                    <dt className="text-xs" style={{ color: '#6b7785' }}>End of Life</dt>
                    <dd className="mt-1 flex items-center gap-1 text-[15px]" style={{ color: '#e8edf2' }}>
                      <Calendar className="h-3.5 w-3.5" style={{ color: '#6b7785' }} />
                      {formatDate(alat.tanggalEol)}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs" style={{ color: '#6b7785' }}>Ditambahkan</dt>
                  <dd className="mt-1 text-[15px]" style={{ color: '#e8edf2' }}>{formatDate(alat.createdAt)}</dd>
                </div>
              </dl>
              {alat.deskripsi && (
                <div className="mt-[18px] pt-4" style={{ borderTop: '1px solid rgba(99,102,241,0.12)' }}>
                  <dt className="text-xs" style={{ color: '#6b7785' }}>Deskripsi</dt>
                  <dd className="mt-1.5 text-[14px] leading-relaxed" style={{ color: '#b3bdc7' }}>{alat.deskripsi}</dd>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3.5">
            <div className="hud-panel hud-rise p-[18px]">
              {alat.foto ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={alat.foto}
                  alt={alat.nama}
                  className="hud-clip-md max-h-80 w-full object-contain"
                  style={{ border: '1px solid rgba(99,102,241,0.16)', background: 'rgba(255,255,255,0.02)' }}
                />
              ) : (
                <div
                  className="hud-clip-md flex h-56 flex-col items-center justify-center gap-2"
                  style={{
                    border: '1px dashed rgba(99,102,241,0.25)',
                    background: 'repeating-linear-gradient(45deg, rgba(99,102,241,0.04) 0 10px, transparent 10px 20px)',
                  }}
                >
                  <ImageIcon className="h-12 w-12" style={{ color: '#5d717d' }} />
                  <span className="hud-label text-[11px]" style={{ color: '#5d717d', letterSpacing: 2 }}>Belum ada foto</span>
                </div>
              )}
              <div className="mt-4 text-center">
                <p className="hud-title text-[30px]" style={{ color: '#fff' }}>{stokTersedia}</p>
                <p className="mt-0.5 text-xs" style={{ color: '#6b7785' }}>unit tersedia</p>
              </div>
            </div>

            {alat.peminjamanDetails.length > 0 && (
              <div className="hud-panel hud-rise p-[18px]">
                <h3 className="hud-label mb-3 text-[11px]" style={{ color: '#c3ccd6' }}>Sedang Dipinjam</h3>
                <div className="flex flex-col gap-2.5">
                  {alat.peminjamanDetails.map((d) => (
                    <div key={d.id} className="flex items-center justify-between text-sm">
                      <span style={{ color: '#e8edf2' }}>{d.peminjaman.user.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: '#6b7785' }}>{d.jumlah} unit</span>
                        <StatusBadge status={d.peminjaman.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1120px]">
      {/* header */}
      <div className="mb-5 flex flex-wrap items-center gap-3 hud-rise">
        <Link
          href="/alat"
          className="hud-clip-sm flex h-[38px] w-[38px] items-center justify-center"
          style={{ color: '#8a97a3', border: '1px solid rgba(99,102,241,0.25)' }}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="hud-title" style={{ fontSize: 22 }}>{alat.nama}</h1>
          <p className="mt-1 text-[13px]" style={{ color: '#8a97a3' }}>{alat.kode}</p>
        </div>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        <div className="lg:col-span-2" style={{ gridColumn: 'span 2 / span 2' }}>
          <div className="hud-panel hud-accent-top hud-rise p-[22px]">
            <h2 className="hud-label mb-[18px] text-[12px]" style={{ color: '#c3ccd6' }}>Informasi Alat</h2>
            <dl className="grid grid-cols-2 gap-[18px]">
              <div>
                <dt className="text-xs" style={{ color: '#6b7785' }}>Kategori</dt>
                <dd className="mt-1 text-[15px]" style={{ color: '#e8edf2' }}>{alat.kategori}</dd>
              </div>
              <div>
                <dt className="text-xs" style={{ color: '#6b7785' }}>Lokasi</dt>
                <dd className="mt-1 flex items-center gap-1 text-[15px]" style={{ color: '#e8edf2' }}>
                  <MapPin className="h-3.5 w-3.5" style={{ color: '#6b7785' }} />
                  {alat.lokasi || '-'}
                </dd>
              </div>
              <div>
                <dt className="text-xs" style={{ color: '#6b7785' }}>Total Stok</dt>
                <dd className="mt-1 text-[15px]" style={{ color: '#e8edf2' }}>{alat.stok} unit</dd>
              </div>
              <div>
                <dt className="text-xs" style={{ color: '#6b7785' }}>Stok Tersedia</dt>
                <dd className="mt-1.5">
                  <StockBadge stok={alat.stok} stokTersedia={stokTersedia} />
                </dd>
              </div>
              {alat.tanggalEos && (
                <div>
                  <dt className="text-xs" style={{ color: '#6b7785' }}>End of Support</dt>
                  <dd className="mt-1 flex items-center gap-1 text-[15px]" style={{ color: '#e8edf2' }}>
                    <Calendar className="h-3.5 w-3.5" style={{ color: '#6b7785' }} />
                    {formatDate(alat.tanggalEos)}
                  </dd>
                </div>
              )}
              {alat.tanggalEol && (
                <div>
                  <dt className="text-xs" style={{ color: '#6b7785' }}>End of Life</dt>
                  <dd className="mt-1 flex items-center gap-1 text-[15px]" style={{ color: '#e8edf2' }}>
                    <Calendar className="h-3.5 w-3.5" style={{ color: '#6b7785' }} />
                    {formatDate(alat.tanggalEol)}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs" style={{ color: '#6b7785' }}>Ditambahkan</dt>
                <dd className="mt-1 text-[15px]" style={{ color: '#e8edf2' }}>{formatDate(alat.createdAt)}</dd>
              </div>
            </dl>
            {alat.deskripsi && (
              <div className="mt-[18px] pt-4" style={{ borderTop: '1px solid rgba(99,102,241,0.12)' }}>
                <dt className="text-xs" style={{ color: '#6b7785' }}>Deskripsi</dt>
                <dd className="mt-1.5 text-[14px] leading-relaxed" style={{ color: '#b3bdc7' }}>{alat.deskripsi}</dd>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="hud-panel hud-rise p-[18px]">
            {alat.foto ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={alat.foto}
                alt={alat.nama}
                className="hud-clip-md max-h-80 w-full object-contain"
                style={{ border: '1px solid rgba(99,102,241,0.16)', background: 'rgba(255,255,255,0.02)' }}
              />
            ) : (
              <div
                className="hud-clip-md flex h-56 flex-col items-center justify-center gap-2"
                style={{
                  border: '1px dashed rgba(99,102,241,0.25)',
                  background: 'repeating-linear-gradient(45deg, rgba(99,102,241,0.04) 0 10px, transparent 10px 20px)',
                }}
              >
                <ImageIcon className="h-12 w-12" style={{ color: '#5d717d' }} />
                <span className="hud-label text-[11px]" style={{ color: '#5d717d', letterSpacing: 2 }}>Belum ada foto</span>
              </div>
            )}
            <div className="mt-4 text-center">
              <p className="hud-title text-[30px]" style={{ color: '#fff' }}>{stokTersedia}</p>
              <p className="mt-0.5 text-xs" style={{ color: '#6b7785' }}>unit tersedia</p>
            </div>
          </div>

          {alat.peminjamanDetails.length > 0 && (
            <div className="hud-panel hud-rise p-[18px]">
              <h3 className="hud-label mb-3 text-[11px]" style={{ color: '#c3ccd6' }}>Sedang Dipinjam</h3>
              <div className="flex flex-col gap-2.5">
                {alat.peminjamanDetails.map((d) => (
                  <div key={d.id} className="flex items-center justify-between text-sm">
                    <span style={{ color: '#e8edf2' }}>{d.peminjaman.user.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: '#6b7785' }}>{d.jumlah} unit</span>
                      <StatusBadge status={d.peminjaman.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
