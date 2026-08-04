import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import QRCode from 'qrcode'
import Link from 'next/link'
import { ArrowLeft, Download, QrCode } from 'lucide-react'
import { PrintButton } from './PrintButton'

interface SearchParams {
  alatId?: string
}

// Cache hasil generate QR per proses server. Kode unit hampir tidak pernah
// berubah, jadi tiap kode cukup digenerate sekali; kunjungan dan klik filter
// berikutnya tinggal pakai ulang (236 unit ≈ ratusan ms CPU yang dihemat).
// Kunci = kode: bila kode diganti, entri baru dibuat dan entri lama menganggur
// (ukurannya kecil, dibersihkan saat proses restart).
const qrCache = new Map<string, string>()

async function qrDataUrl(kode: string): Promise<string> {
  const cached = qrCache.get(kode)
  if (cached) return cached
  const dataUrl = await QRCode.toDataURL(kode, { margin: 1, width: 240, errorCorrectionLevel: 'M' })
  qrCache.set(kode, dataUrl)
  return dataUrl
}

export default async function LabelsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  // Halaman ini memetakan seluruh kode inventaris — khusus admin.
  const session = await auth()
  if (session?.user.role !== 'admin') redirect('/dashboard')

  const sp = await searchParams
  const alatIdRaw = sp.alatId ? parseInt(sp.alatId, 10) : null
  const alatId = alatIdRaw && Number.isInteger(alatIdRaw) && alatIdRaw > 0 ? alatIdRaw : null

  const [alats, units] = await Promise.all([
    prisma.alat.findMany({
      orderBy: { nama: 'asc' },
      select: { id: true, nama: true, _count: { select: { units: true } } },
    }),
    prisma.unit.findMany({
      where: alatId ? { alatId } : {},
      orderBy: [{ alatId: 'asc' }, { kode: 'asc' }],
      select: { id: true, kode: true, alat: { select: { nama: true } } },
    }),
  ])

  // Isi QR = kode unit polos (bukan URL) supaya terbaca sama oleh kamera HP
  // maupun alat scan fisik. Digenerate di server, dikirim sebagai data URI.
  const labels = await Promise.all(
    units.map(async (u) => ({
      id: u.id,
      kode: u.kode,
      alatNama: u.alat.nama,
      qr: await qrDataUrl(u.kode),
    })),
  )

  const totalSemua = alats.reduce((s, a) => s + a._count.units, 0)

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3 print:hidden">
        <Link
          href="/alat"
          className="flex h-[38px] w-[38px] items-center justify-center hud-clip-sm"
          style={{ color: '#8a97a3', border: '1px solid rgba(99,102,241,0.25)' }}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="hud-title" style={{ fontSize: 22 }}>Cetak Label QR</h1>
          <p className="mt-1 text-[13px]" style={{ color: '#8a97a3' }}>
            Cetak ke kertas stiker A4 dengan printer biasa, lalu tempel di tiap unit
          </p>
        </div>
        <PrintButton />
      </div>

      <div className="mb-4 flex flex-wrap gap-2 print:hidden">
        <Link
          href="/alat/labels"
          className="hud-clip-sm px-3 py-1.5 text-[12px] font-semibold"
          style={{
            color: alatId === null ? '#fff' : '#8a97a3',
            border: `1px solid ${alatId === null ? 'rgba(99,102,241,0.6)' : 'rgba(99,102,241,0.2)'}`,
            background: alatId === null ? 'rgba(99,102,241,0.15)' : 'transparent',
          }}
        >
          Semua ({totalSemua})
        </Link>
        {alats.map((a) => (
          <Link
            key={a.id}
            href={`/alat/labels?alatId=${a.id}`}
            className="hud-clip-sm px-3 py-1.5 text-[12px] font-semibold"
            style={{
              color: alatId === a.id ? '#fff' : '#8a97a3',
              border: `1px solid ${alatId === a.id ? 'rgba(99,102,241,0.6)' : 'rgba(99,102,241,0.2)'}`,
              background: alatId === a.id ? 'rgba(99,102,241,0.15)' : 'transparent',
            }}
          >
            {a.nama} ({a._count.units})
          </Link>
        ))}
      </div>

      {labels.length === 0 ? (
        <div className="hud-panel p-8 text-center print:hidden">
          <QrCode className="mx-auto mb-2 h-8 w-8" style={{ color: '#5d717d' }} />
          <p className="text-[13.5px]" style={{ color: '#8a97a3' }}>Belum ada unit untuk dicetak</p>
        </div>
      ) : (
        <div className="mx-auto max-w-[880px] rounded-md bg-[#f5f5f2] p-5 shadow-2xl print:max-w-none print:rounded-none print:bg-white print:p-0 print:shadow-none">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 print:grid-cols-3 print:gap-2">
            {labels.map((l) => (
              <div
                key={l.id}
                className="flex flex-col items-center rounded-lg border border-dashed border-[#c9c9c2] bg-white px-2 py-3 text-center break-inside-avoid"
              >
                {/* Data URI PNG bisa langsung diunduh lewat anchor download —
                    klik QR = simpan file QR-<kode>.png. Nonaktif saat cetak. */}
                <a
                  href={l.qr}
                  download={`QR-${l.kode}.png`}
                  title={`Unduh QR ${l.kode} (PNG)`}
                  className="group relative cursor-pointer rounded-md transition hover:ring-2 hover:ring-indigo-500/60 print:pointer-events-none print:ring-0"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- data URI lokal, next/image tidak relevan */}
                  <img src={l.qr} alt={`QR ${l.kode}`} width={96} height={96} className="h-24 w-24" />
                  <span className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded bg-indigo-600 text-white opacity-0 shadow transition group-hover:opacity-100 print:hidden">
                    <Download className="h-3 w-3" />
                  </span>
                </a>
                <p className="mt-1.5 font-mono text-[12.5px] font-bold tracking-wide text-black">{l.kode}</p>
                <p className="mt-0.5 text-[10.5px] text-neutral-500">{l.alatNama}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-4 text-center text-[12px] print:hidden" style={{ color: '#6b7785' }}>
        {labels.length} label · Klik QR untuk unduh PNG-nya · Tips: lapisi stiker dengan lakban bening agar tahan lama
      </p>
    </div>
  )
}
