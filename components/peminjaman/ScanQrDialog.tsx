'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Camera, Check, ScanLine, X, AlertCircle } from 'lucide-react'
import type { Html5Qrcode } from 'html5-qrcode'

export interface ScannedUnit {
  id: number
  kode: string
  kondisi: 'baik' | 'rusak'
  status: 'tersedia' | 'dipinjam' | 'rusak'
  alat: {
    id: number
    nama: string
    kategori: string
    totalUnit: number
    tersedia: number
    dipinjam: number
    rusak: number
  }
}

interface Props {
  open: boolean
  onClose: () => void
  // Mengembalikan 'added' bila unit masuk keranjang, 'duplicate' bila sudah
  // ada, 'limit' bila alat tersebut sudah punya 1 unit terpilih.
  onUnitScanned: (unit: ScannedUnit) => 'added' | 'duplicate' | 'limit'
  totalDipilih: number
}

type Toast = { kind: 'ok' | 'err'; text: string }

// Isi QR adalah input tak tepercaya (stiker bisa dipalsukan): batasi panjang
// dan karakter di klien sebelum dikirim; server memvalidasi ulang.
const KODE_RE = /^[A-Za-z0-9 _\-.()/]{1,64}$/

const REGION_ID = 'qr-scan-region'

export function ScanQrDialog({ open, onClose, onUnitScanned, totalDipilih }: Props) {
  const [toast, setToast] = useState<Toast | null>(null)
  const [cameraError, setCameraError] = useState('')
  const [cameraReady, setCameraReady] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  // Kamera membaca ~10 frame/detik: tahan kode yang sama agar satu stiker
  // tidak diproses berkali-kali selama masih di depan lensa.
  const lastScanRef = useRef<{ kode: string; at: number }>({ kode: '', at: 0 })
  const busyRef = useRef(false)

  const handleCode = useCallback(
    async (raw: string) => {
      const kode = raw.trim()
      if (!kode) return
      if (!KODE_RE.test(kode)) {
        setToast({ kind: 'err', text: 'Kode tidak valid (maks 64 karakter huruf/angka).' })
        return
      }

      const now = Date.now()
      if (lastScanRef.current.kode === kode.toLowerCase() && now - lastScanRef.current.at < 2500) {
        return
      }
      lastScanRef.current = { kode: kode.toLowerCase(), at: now }

      if (busyRef.current) return
      busyRef.current = true
      try {
        const res = await fetch(`/api/units/lookup?kode=${encodeURIComponent(kode)}`)
        const data = await res.json().catch(() => ({}))

        if (res.status === 429) {
          setToast({ kind: 'err', text: 'Terlalu banyak scan, tunggu sebentar.' })
          return
        }
        if (res.status === 404) {
          setToast({ kind: 'err', text: `Kode "${kode}" tidak dikenal. Pastikan stiker QR resmi lab.` })
          return
        }
        if (!res.ok) {
          setToast({ kind: 'err', text: data.error ?? 'Gagal memeriksa kode, coba lagi.' })
          return
        }

        const unit = data.data as ScannedUnit
        if (unit.status === 'dipinjam') {
          setToast({ kind: 'err', text: `${unit.kode} (${unit.alat.nama}) sedang dipinjam.` })
          return
        }
        if (unit.status === 'rusak') {
          setToast({ kind: 'err', text: `${unit.kode} (${unit.alat.nama}) berstatus rusak, tidak bisa dipinjam.` })
          return
        }

        const result = onUnitScanned(unit)
        if (result === 'duplicate') {
          setToast({ kind: 'err', text: `${unit.kode} sudah ada di daftar.` })
        } else if (result === 'limit') {
          setToast({ kind: 'err', text: `${unit.alat.nama} sudah dipilih 1 unit — maksimal 1 unit per alat.` })
        } else {
          setToast({ kind: 'ok', text: `${unit.kode} · ${unit.alat.nama} ditambahkan.` })
        }
      } catch {
        setToast({ kind: 'err', text: 'Jaringan bermasalah, coba lagi.' })
      } finally {
        busyRef.current = false
      }
    },
    [onUnitScanned],
  )

  // Simpan handler terbaru di ref agar callback kamera (terdaftar sekali saat
  // start) tidak memakai closure basi.
  const handleCodeRef = useRef(handleCode)
  useEffect(() => {
    handleCodeRef.current = handleCode
  }, [handleCode])

  // Nyalakan/matikan kamera mengikuti open. Library di-import dinamis supaya
  // bundle form tetap ringan dan hanya dimuat saat dialog dibuka.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    let scanner: Html5Qrcode | null = null

    async function start() {
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        if (cancelled) return
        // Reset state sesi scan sebelumnya. Dilakukan setelah await agar tidak
        // sinkron di badan effect (react-hooks/set-state-in-effect).
        setCameraError('')
        setCameraReady(false)
        setToast(null)
        scanner = new Html5Qrcode(REGION_ID, { verbose: false })
        scannerRef.current = scanner
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText) => handleCodeRef.current(decodedText),
          () => {
            /* frame tanpa QR: abaikan */
          },
        )
        if (cancelled) return
        setCameraReady(true)
      } catch {
        if (cancelled) return
        setCameraError(
          window.isSecureContext
            ? 'Kamera tidak tersedia atau izin ditolak. Izinkan akses kamera lalu buka ulang dialog ini.'
            : 'Kamera butuh koneksi HTTPS. Buka halaman ini lewat alamat HTTPS.',
        )
      }
    }
    start()

    return () => {
      cancelled = true
      const s = scanner
      scannerRef.current = null
      if (s) {
        // stop() melempar SINKRON bila kamera tidak pernah jalan — tanpa
        // try/catch, error lolos dari cleanup effect dan meruntuhkan root React.
        try {
          s.stop().catch(() => {}).finally(() => {
            try {
              s.clear()
            } catch {
              /* elemen sudah dilepas React */
            }
          })
        } catch {
          try {
            s.clear()
          } catch {
            /* scanner belum sempat render apa pun */
          }
        }
      }
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || typeof window === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Scan QR unit"
    >
      <div
        className="flex max-h-[calc(100vh-32px)] w-full max-w-[420px] flex-col overflow-y-auto hud-clip-md"
        style={{ background: '#0d1117', border: '1px solid rgba(99,102,241,0.3)' }}
      >
        <div
          className="flex items-center gap-2.5 px-4 py-3.5"
          style={{ borderBottom: '1px solid rgba(99,102,241,0.16)' }}
        >
          <ScanLine className="h-5 w-5 shrink-0" style={{ color: '#5c84ff' }} />
          <div className="min-w-0 flex-1">
            <p className="text-[14.5px] font-bold" style={{ color: '#fff' }}>Scan QR Unit</p>
            <p className="text-[11.5px]" style={{ color: '#6b7785' }}>
              Arahkan kamera ke stiker QR unit
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded hover:bg-white/5"
            style={{ color: '#8a97a3' }}
            aria-label="Tutup"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <div className="flex flex-col gap-3.5 p-4">
          {/* Area kamera. html5-qrcode menyuntikkan <video> ke elemen ini. */}
          <div
            className="relative overflow-hidden hud-clip-sm"
            style={{ background: '#05070a', border: '1px solid rgba(99,102,241,0.25)', minHeight: 200 }}
          >
            <div id={REGION_ID} />
            {!cameraReady && !cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 py-10">
                <Camera className="h-6 w-6" style={{ color: '#5d717d' }} />
                <p className="text-[12.5px]" style={{ color: '#6b7785' }}>Menyalakan kamera…</p>
              </div>
            )}
            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
                <AlertCircle className="h-6 w-6" style={{ color: '#eab308' }} />
                <p className="text-[12.5px] leading-relaxed" style={{ color: '#c3ccd6' }}>{cameraError}</p>
              </div>
            )}
          </div>

          {toast && (
            <p
              className="flex items-start gap-2 px-3 py-2.5 text-[12.5px] leading-relaxed hud-clip-sm"
              role="status"
              aria-live="polite"
              style={
                toast.kind === 'ok'
                  ? { color: '#4ade80', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)' }
                  : { color: '#fca5a5', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }
              }
            >
              {toast.kind === 'ok' ? (
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              ) : (
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              )}
              {toast.text}
            </p>
          )}

          <div className="flex items-center justify-between gap-3">
            <p className="text-[12.5px]" style={{ color: '#8a97a3' }}>
              Terpilih: <b style={{ color: '#fff' }}>{totalDipilih} unit</b>
            </p>
            <button
              type="button"
              onClick={onClose}
              className="hud-btn-primary px-4 py-2 text-[11.5px]"
            >
              SELESAI SCAN
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
