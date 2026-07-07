'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { ScanLine, X, PackageSearch } from 'lucide-react'
import { QrCameraBox } from '@/components/shared/QrCameraBox'

interface LookupResult {
  unit: { id: number; kode: string; alatNama: string }
  peminjaman: {
    id: number
    status: string
    tanggalBatasKembali: string | null
    peminjam: string
    kelas: string | null
    totalUnit: number
  } | null
}

// Scan global pengembalian (admin): scan barang apa pun dari tumpukan
// kembalian, sistem menemukan peminjaman aktifnya dan menawarkan lompat
// langsung ke halaman pengembaliannya.
export function ScanPengembalianButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err' | 'warn'; text: string } | null>(null)
  const [found, setFound] = useState<LookupResult | null>(null)

  async function handleCode(raw: string) {
    const kode = raw.trim()
    if (!kode || busy) return
    setBusy(true)
    setMsg(null)
    setFound(null)
    try {
      const res = await fetch(`/api/peminjaman/lookup-unit?kode=${encodeURIComponent(kode)}`)
      const data = await res.json().catch(() => ({}))
      if (res.status === 404) {
        setMsg({ kind: 'err', text: `Kode "${kode}" tidak dikenal. Pastikan stiker QR resmi lab.` })
        return
      }
      if (res.status === 429) {
        setMsg({ kind: 'err', text: 'Terlalu banyak scan, tunggu sebentar.' })
        return
      }
      if (!res.ok) {
        setMsg({ kind: 'err', text: data.error ?? 'Gagal memeriksa kode, coba lagi.' })
        return
      }
      const result = data.data as LookupResult
      if (!result.peminjaman) {
        setMsg({
          kind: 'warn',
          text: `${result.unit.kode} (${result.unit.alatNama}) tidak sedang dipinjam siapa pun — cek apakah peminjamannya lupa dicatat.`,
        })
        return
      }
      setFound(result)
    } catch {
      setMsg({ kind: 'err', text: 'Jaringan bermasalah, coba lagi.' })
    } finally {
      setBusy(false)
    }
  }

  function close() {
    setOpen(false)
    setMsg(null)
    setFound(null)
  }

  // Alat scan fisik (mode HID keyboard) mengetik kode + Enter dengan jeda
  // antar-tombol < ~30ms. Dengarkan global saat dialog terbuka dan terima
  // hanya rentetan berkecepatan mesin — ketikan manusia terlalu lambat,
  // jadi tidak ada jalur ketik manual.
  const handleCodeRef = useRef(handleCode)
  handleCodeRef.current = handleCode
  useEffect(() => {
    if (!open) return
    let buffer = ''
    let lastAt = 0
    function onKey(e: KeyboardEvent) {
      const now = Date.now()
      if (now - lastAt > 100) buffer = ''
      lastAt = now
      if (e.key === 'Enter') {
        if (buffer.length >= 2) handleCodeRef.current(buffer)
        buffer = ''
        return
      }
      if (e.key === 'Escape') {
        setOpen(false)
        return
      }
      if (e.key.length === 1) buffer += e.key
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hud-btn-ghost flex items-center gap-2 px-4 py-2.5 text-[12px]"
      >
        <ScanLine className="h-4 w-4" />
        <span className="hidden sm:inline">Scan Pengembalian</span>
        <span className="sm:hidden">Scan</span>
      </button>

      {open &&
        typeof window !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ background: 'rgba(3,7,14,0.7)' }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) close()
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Scan pengembalian"
          >
            <div
              className="hud-clip-md w-full max-w-md p-5"
              style={{ background: '#0d1520', border: '1px solid rgba(92,132,255,0.3)' }}
            >
              <div className="mb-3 flex items-center gap-2.5">
                <div
                  className="flex h-8 w-8 items-center justify-center hud-clip-sm"
                  style={{ background: 'rgba(92,132,255,0.12)', border: '1px solid rgba(92,132,255,0.3)' }}
                >
                  <PackageSearch className="h-4 w-4" style={{ color: '#5c84ff' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[15px] font-bold" style={{ color: '#e8edf2' }}>Scan Pengembalian</h3>
                  <p className="text-[11.5px]" style={{ color: '#6b7785' }}>
                    Scan barang apa pun — sistem mencari peminjaman aktifnya
                  </p>
                </div>
                <button
                  type="button"
                  onClick={close}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded hover:bg-white/5"
                  style={{ color: '#8a97a3' }}
                  aria-label="Tutup"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mb-3">
                <QrCameraBox onCode={handleCode} height={190} />
              </div>

              <p className="mb-3 text-center text-[11px]" style={{ color: '#6b7785' }}>
                Arahkan kamera ke stiker QR — alat scan fisik juga langsung terbaca
              </p>

              {msg && (
                <p
                  className="mb-3 px-3 py-2 text-[12px] leading-relaxed hud-clip-sm"
                  role="status"
                  aria-live="polite"
                  style={
                    msg.kind === 'err'
                      ? { color: '#fca5a5', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }
                      : msg.kind === 'warn'
                        ? { color: '#fbbf24', background: 'rgba(234,179,8,0.07)', border: '1px solid rgba(234,179,8,0.35)' }
                        : { color: '#4ade80', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)' }
                  }
                >
                  {msg.text}
                </p>
              )}

              {found && found.peminjaman && (
                <div
                  className="hud-clip-sm px-3.5 py-3"
                  style={{
                    border: '1px solid rgba(92,132,255,0.4)',
                    background: 'linear-gradient(160deg, rgba(92,132,255,0.08), rgba(255,255,255,0.01))',
                  }}
                >
                  <p className="text-[13.5px] font-bold" style={{ color: '#e8edf2' }}>
                    {found.unit.kode} · {found.unit.alatNama}
                  </p>
                  <p className="mt-1 text-[12.5px] leading-relaxed" style={{ color: '#8a97a3' }}>
                    {found.peminjaman.status === 'dipinjam' ? 'Sedang dipinjam' : 'Menunggu verifikasi'} di{' '}
                    <b style={{ color: '#e8edf2' }}>Peminjaman #{found.peminjaman.id}</b> — {found.peminjaman.peminjam}
                    {found.peminjaman.kelas ? ` (${found.peminjaman.kelas})` : ''}, {found.peminjaman.totalUnit} unit.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      close()
                      router.push(`/peminjaman/${found.peminjaman!.id}`)
                    }}
                    className="hud-btn-primary mt-2.5 px-4 py-2 text-[11.5px]"
                  >
                    BUKA PEMINJAMAN #{found.peminjaman.id} →
                  </button>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
