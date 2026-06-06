import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { GlassCard } from '@/components/shared/GlassCard'
import { StockBadge } from '@/components/shared/StockBadge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDate } from '@/lib/utils'
import { Package, MapPin, Calendar, ArrowLeft, Pencil } from 'lucide-react'
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/alat" className="rounded-lg border border-neutral-800 p-2 text-neutral-400 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">{alat.nama}</h1>
            <p className="text-sm text-neutral-400">{alat.kode}</p>
          </div>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Link
              href={`/alat/${alat.id}/edit`}
              className="flex items-center gap-2 rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-300 hover:text-white"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
            <DeleteAlatButton id={alat.id} />
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <GlassCard className="p-5">
            <h2 className="mb-4 text-sm font-semibold text-neutral-300">Informasi Alat</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-neutral-500">Kategori</dt>
                <dd className="mt-1 text-sm text-white">{alat.kategori}</dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500">Lokasi</dt>
                <dd className="mt-1 flex items-center gap-1 text-sm text-white">
                  <MapPin className="h-3.5 w-3.5 text-neutral-500" />
                  {alat.lokasi || '-'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500">Total Stok</dt>
                <dd className="mt-1 text-sm text-white">{alat.stok} unit</dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500">Stok Tersedia</dt>
                <dd className="mt-1">
                  <StockBadge stok={alat.stok} stokTersedia={stokTersedia} />
                </dd>
              </div>
              {alat.tanggalEos && (
                <div>
                  <dt className="text-xs text-neutral-500">End of Support</dt>
                  <dd className="mt-1 flex items-center gap-1 text-sm text-white">
                    <Calendar className="h-3.5 w-3.5 text-neutral-500" />
                    {formatDate(alat.tanggalEos)}
                  </dd>
                </div>
              )}
              {alat.tanggalEol && (
                <div>
                  <dt className="text-xs text-neutral-500">End of Life</dt>
                  <dd className="mt-1 flex items-center gap-1 text-sm text-white">
                    <Calendar className="h-3.5 w-3.5 text-neutral-500" />
                    {formatDate(alat.tanggalEol)}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-neutral-500">Ditambahkan</dt>
                <dd className="mt-1 text-sm text-white">{formatDate(alat.createdAt)}</dd>
              </div>
            </dl>
            {alat.deskripsi && (
              <div className="mt-4 border-t border-neutral-800 pt-4">
                <dt className="text-xs text-neutral-500">Deskripsi</dt>
                <dd className="mt-1 text-sm text-neutral-300">{alat.deskripsi}</dd>
              </div>
            )}
          </GlassCard>
        </div>

        <div className="space-y-4">
          <GlassCard className="p-5">
            <div className="flex h-24 items-center justify-center rounded-lg bg-white/[0.02]">
              <Package className="h-12 w-12 text-neutral-700" />
            </div>
            <div className="mt-4 text-center">
              <p className="text-2xl font-bold text-white">{stokTersedia}</p>
              <p className="text-xs text-neutral-500">unit tersedia</p>
            </div>
          </GlassCard>

          {alat.peminjamanDetails.length > 0 && (
            <GlassCard className="p-5">
              <h3 className="mb-3 text-sm font-semibold text-neutral-300">Sedang Dipinjam</h3>
              {alat.peminjamanDetails.map((d) => (
                <div key={d.id} className="flex items-center justify-between text-sm">
                  <span className="text-white">{d.peminjaman.user.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-500">{d.jumlah} unit</span>
                    <StatusBadge status={d.peminjaman.status} />
                  </div>
                </div>
              ))}
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  )
}
