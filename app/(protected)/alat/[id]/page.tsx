import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDate } from '@/lib/utils'
import { MapPin, Calendar, ArrowLeft, Pencil, ImageIcon } from 'lucide-react'
import Link from 'next/link'
import { DeleteAlatButton } from './DeleteAlatButton'
import { UnitManager } from './UnitManager'

const AKTIF = ['menunggu_verifikasi', 'dipinjam']

export default async function AlatDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numId = Number(id)
  if (!Number.isInteger(numId) || numId <= 0) notFound()

  const session = await auth()
  const isAdmin = session?.user.role === 'admin'

  const alat = await prisma.alat.findUnique({
    where: { id: numId },
    include: {
      units: {
        orderBy: { kode: 'asc' },
        include: {
          peminjamanDetails: {
            where: { peminjaman: { status: { in: AKTIF } } },
            include: {
              peminjaman: {
                select: {
                  id: true,
                  status: true,
                  user: { select: { name: true, kelas: true } },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!alat) notFound()

  let tersedia = 0, dipinjam = 0, rusak = 0
  const unitRows = alat.units.map((u) => {
    const aktif = u.peminjamanDetails[0]
    const status: 'tersedia' | 'dipinjam' | 'rusak' =
      u.kondisi === 'rusak' ? 'rusak' : aktif ? 'dipinjam' : 'tersedia'
    if (status === 'tersedia') tersedia++
    else if (status === 'dipinjam') dipinjam++
    else rusak++
    return {
      id: u.id,
      kode: u.kode,
      kondisi: u.kondisi as 'baik' | 'rusak',
      catatan: u.catatan,
      status,
      peminjaman: aktif?.peminjaman ?? null,
    }
  })
  const total = unitRows.length

  const infoSection = (
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
          <dt className="text-xs" style={{ color: '#6b7785' }}>Total Unit</dt>
          <dd className="mt-1 text-[15px]" style={{ color: '#e8edf2' }}>{total} unit</dd>
        </div>
        <div>
          <dt className="text-xs" style={{ color: '#6b7785' }}>Tersedia</dt>
          <dd className="mt-1 text-[15px] font-bold" style={{ color: tersedia > 0 ? '#4ade80' : '#ef4444' }}>{tersedia}</dd>
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
  )

  const sidebar = (
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
          <p className="hud-title text-[30px]" style={{ color: '#fff' }}>{tersedia}</p>
          <p className="mt-0.5 text-xs" style={{ color: '#6b7785' }}>unit tersedia dari {total}</p>
        </div>
      </div>

      {total > 0 && (
        <div className="hud-panel hud-rise p-[18px]">
          <p className="hud-label mb-2 text-[10px]" style={{ color: '#6b7785' }}>RINGKASAN KONDISI</p>
          <div className="flex h-3 gap-[2px] overflow-hidden hud-clip-sm">
            {tersedia > 0 && <div style={{ flex: tersedia, background: '#4ade80' }} />}
            {dipinjam > 0 && <div style={{ flex: dipinjam, background: '#60a5fa' }} />}
            {rusak > 0 && <div style={{ flex: rusak, background: '#f87171' }} />}
          </div>
          <div className="mt-2 flex justify-between text-[11px]">
            <span style={{ color: '#4ade80' }}>{tersedia} tersedia</span>
            <span style={{ color: '#60a5fa' }}>{dipinjam} dipinjam</span>
            <span style={{ color: '#f87171' }}>{rusak} rusak</span>
          </div>
        </div>
      )}
    </div>
  )

  if (isAdmin) {
    return (
      <div>
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
              <p className="mt-1 text-[13px]" style={{ color: '#8a97a3' }}>{alat.kategori} · {total} unit</p>
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

        <div className="grid gap-4" style={{ gridTemplateColumns: '2fr 1fr' }}>
          <div className="flex flex-col gap-4" style={{ minWidth: 0 }}>
            {infoSection}
            <UnitManager alatId={alat.id} initialUnits={unitRows} />
          </div>
          {sidebar}
        </div>
      </div>
    )
  }

  return (
    <div>
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
          <p className="mt-1 text-[13px]" style={{ color: '#8a97a3' }}>{alat.kategori}</p>
        </div>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <div className="flex flex-col gap-4" style={{ minWidth: 0 }}>
          {infoSection}
          {/* Unit list for siswa - read only */}
          {total > 0 && (
            <div className="hud-panel p-[22px]">
              <h2 className="hud-label mb-3.5 text-[12px]" style={{ color: '#c3ccd6' }}>Unit Tersedia</h2>
              <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
                {unitRows.map((u) => (
                  <div
                    key={u.id}
                    className="hud-clip-sm px-3 py-2 text-center"
                    style={{
                      border: `1px solid ${u.status === 'tersedia' ? 'rgba(34,197,94,0.3)' : u.status === 'dipinjam' ? 'rgba(99,102,241,0.16)' : 'rgba(239,68,68,0.3)'}`,
                      background: u.status === 'tersedia' ? 'rgba(34,197,94,0.06)' : 'transparent',
                      opacity: u.status !== 'tersedia' ? 0.6 : 1,
                    }}
                  >
                    <p className="text-[12.5px] font-bold" style={{ fontFamily: 'var(--font-orbitron), sans-serif', color: u.status === 'tersedia' ? '#4ade80' : u.status === 'dipinjam' ? '#6b7785' : '#f87171' }}>
                      {u.kode}
                    </p>
                    <p className="mt-0.5 text-[10px]" style={{ color: u.status === 'tersedia' ? '#4ade80' : '#6b7785' }}>
                      {u.status === 'tersedia' ? 'Tersedia' : u.status === 'dipinjam' ? 'Dipinjam' : 'Rusak'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        {sidebar}
      </div>
    </div>
  )
}
