'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle, RotateCcw, XCircle, AlertTriangle, Check } from 'lucide-react'
import { QrCameraBox } from '@/components/shared/QrCameraBox'

interface UnitItem {
  unitId: number
  kode: string
  nama: string
}

interface Props {
  id: number
  status: string
  isAdmin: boolean
  isOwner: boolean
  units?: UnitItem[]
}

export function PeminjamanActions({ id, status, isAdmin, isOwner, units = [] }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  // State modal pengembalian
  const [returnOpen, setReturnOpen] = useState(false)
  const [rusak, setRusak] = useState<Record<number, string>>({}) // unitId -> catatan
  const [catatan, setCatatan] = useState('')
  // Verifikasi fisik via scan QR: unit harus discan satu per satu sebelum
  // pengembalian bisa diproses — barang tertukar ketahuan di sini.
  const [verified, setVerified] = useState<Set<number>>(new Set())
  const [scanMsg, setScanMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  function openReturn() {
    setRusak({})
    setCatatan('')
    setVerified(new Set())
    setScanMsg(null)
    setReturnOpen(true)
  }

  function handleScanCode(raw: string) {
    const kode = raw.trim()
    if (!kode) return
    const unit = units.find((u) => u.kode.toLowerCase() === kode.toLowerCase())
    if (!unit) {
      setScanMsg({
        kind: 'err',
        text: `${kode} BUKAN bagian peminjaman ini — barang tertukar? Yang dipinjam: ${units.map((u) => u.kode).join(', ')}.`,
      })
      return
    }
    if (verified.has(unit.unitId)) {
      setScanMsg({ kind: 'err', text: `${unit.kode} sudah terverifikasi.` })
      return
    }
    setVerified((prev) => new Set(prev).add(unit.unitId))
    setScanMsg({ kind: 'ok', text: `${unit.kode} cocok — ${unit.nama} terverifikasi kembali.` })
  }

  // Checklist manual: admin bisa menandai unit "sudah kembali" cukup dengan
  // mengetuk (tanpa scan, tanpa wajib alasan). Scan QR tetap berfungsi.
  function toggleVerified(unitId: number) {
    setVerified((prev) => {
      const next = new Set(prev)
      if (next.has(unitId)) next.delete(unitId)
      else next.add(unitId)
      return next
    })
  }

  function centangSemua() {
    setVerified(new Set(units.map((u) => u.unitId)))
  }

  // Alat scan fisik (mode HID keyboard) mengetik kode + Enter dengan jeda
  // antar-tombol < ~100ms. Dengarkan global saat dialog terbuka dan terima
  // hanya rentetan berkecepatan mesin — ketikan manusia terlalu lambat, jadi
  // tidak ada jalur ketik manual (input & tombol Scan sudah dihapus).
  const handleScanRef = useRef(handleScanCode)
  useEffect(() => {
    handleScanRef.current = handleScanCode
  })
  useEffect(() => {
    if (!returnOpen) return
    let buffer = ''
    let lastAt = 0
    function onKey(e: KeyboardEvent) {
      // Abaikan bila fokus di textarea catatan (biar admin bisa mengetik biasa).
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      const now = Date.now()
      if (now - lastAt > 100) buffer = ''
      lastAt = now
      if (e.key === 'Enter') {
        if (buffer.length >= 2) handleScanRef.current(buffer)
        buffer = ''
        return
      }
      if (e.key.length === 1) buffer += e.key
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [returnOpen])

  async function doAction(action: string, body: Record<string, unknown> = {}) {
    setLoading(action)
    setError('')
    const res = await fetch(`/api/peminjaman/${id}/${action}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      setReturnOpen(false)
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Terjadi kesalahan')
    }
    setLoading(null)
  }

  function toggleRusak(unitId: number) {
    setRusak((prev) => {
      const next = { ...prev }
      if (unitId in next) delete next[unitId]
      else next[unitId] = ''
      return next
    })
  }

  function submitReturn() {
    const kerusakan = Object.entries(rusak).map(([unitId, cat]) => ({
      unitId: Number(unitId),
      catatan: cat.trim() || undefined,
    }))
    // Alasan skip ikut tercatat di catatan pengembalian agar terlihat di
    // riwayat (dan di banner siswa) — bukan jalan pintas diam-diam.
    const catatanFinal = catatan.trim().slice(0, 500)
    doAction('return', { catatan: catatanFinal || undefined, kerusakan })
  }

  const canVerify = isAdmin && status === 'menunggu_verifikasi'
  const canReturn = isAdmin && status === 'dipinjam'
  // Siswa hanya boleh membatalkan sebelum pengambilan. Setelah `dipinjam`
  // (barang di tangan siswa) hanya admin yang boleh membatalkan.
  const canCancel =
    status === 'menunggu_verifikasi'
      ? isAdmin || isOwner
      : status === 'dipinjam'
        ? isAdmin
        : false

  if (!canVerify && !canReturn && !canCancel) return null

  function handleCancel() {
    // Pinjaman aktif (`dipinjam`) dibatalkan admin: wajib alasan (jejak audit).
    if (status === 'dipinjam') {
      const alasan = prompt('Alasan membatalkan peminjaman yang sedang berjalan (wajib):')
      if (!alasan || !alasan.trim()) return
      doAction('cancel', { alasan: alasan.trim() })
      return
    }
    // Batal sebelum pengambilan: alasan opsional.
    const alasan = prompt('Alasan pembatalan (opsional):') ?? ''
    doAction('cancel', { alasan })
  }

  const rusakCount = Object.keys(rusak).length

  return (
    <div className="hud-panel p-5">
      <h2 className="hud-label mb-3.5 text-[11px]" style={{ color: '#c3ccd6' }}>Aksi</h2>
      {error && (
        <p
          className="mb-3 px-3 py-2 text-xs hud-clip-sm"
          style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}
        >
          {error}
        </p>
      )}
      <div className="flex flex-col gap-2.5">
        {canVerify && (
          <button
            onClick={() => doAction('verify')}
            disabled={loading === 'verify'}
            className="flex w-full items-center gap-2.5 px-3.5 py-3 text-[13.5px] font-semibold transition hud-clip-sm disabled:opacity-60"
            style={{ color: '#22c55e', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}
          >
            <CheckCircle className="h-4 w-4" />
            {loading === 'verify' ? 'Memproses...' : 'Verifikasi & Setujui'}
          </button>
        )}
        {canReturn && (
          <button
            onClick={openReturn}
            disabled={loading === 'return'}
            className="flex w-full items-center gap-2.5 px-3.5 py-3 text-[13.5px] font-semibold transition hud-clip-sm disabled:opacity-60"
            style={{ color: '#5c84ff', background: 'rgba(92,132,255,0.1)', border: '1px solid rgba(92,132,255,0.25)' }}
          >
            <RotateCcw className="h-4 w-4" />
            Tandai Dikembalikan
          </button>
        )}
        {canCancel && (
          <button
            onClick={handleCancel}
            disabled={loading === 'cancel'}
            className="flex w-full items-center gap-2.5 px-3.5 py-3 text-[13.5px] font-semibold transition hud-clip-sm disabled:opacity-60"
            style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}
          >
            <XCircle className="h-4 w-4" />
            {loading === 'cancel' ? 'Membatalkan...' : 'Batalkan Peminjaman'}
          </button>
        )}
      </div>

      {returnOpen && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: 'rgba(3,7,14,0.7)' }}
          onClick={() => !loading && setReturnOpen(false)}
        >
          <div
            className="hud-clip-md flex w-full max-w-md flex-col"
            style={{ background: '#0d1520', border: '1px solid rgba(92,132,255,0.3)', maxHeight: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          >
          <div className="flex-1 overflow-y-auto p-5">
            <div className="mb-3 flex items-center gap-2.5">
              <div
                className="flex h-8 w-8 items-center justify-center hud-clip-sm"
                style={{ background: 'rgba(92,132,255,0.12)', border: '1px solid rgba(92,132,255,0.3)' }}
              >
                <RotateCcw className="h-4 w-4" style={{ color: '#5c84ff' }} />
              </div>
              <h3 className="text-[15px] font-bold" style={{ color: '#e8edf2' }}>Proses Pengembalian</h3>
            </div>
            <p className="mb-3 text-[12.5px] leading-relaxed" style={{ color: '#8a97a3' }}>
              Scan QR tiap barang yang dikembalikan untuk memastikan{' '}
              <span style={{ color: '#5c84ff' }}>unit fisik yang benar</span> memang kembali. Setelah terverifikasi,
              unit yang <span style={{ color: '#ef4444' }}>rusak</span> bisa ditandai.
            </p>

            {/* progres verifikasi */}
            <div className="mb-3 flex items-center gap-2.5 text-[12px]" style={{ color: '#8a97a3' }}>
              <span>
                Terverifikasi <b style={{ color: '#fff' }}>{verified.size}/{units.length}</b>
              </span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: 'rgba(99,102,241,0.12)' }}>
                <span
                  className="block h-full rounded-full transition-all"
                  style={{
                    width: `${units.length ? (verified.size / units.length) * 100 : 0}%`,
                    background: 'linear-gradient(90deg, #3b82f6, #22c55e)',
                  }}
                />
              </span>
            </div>

            {verified.size < units.length && (
              <button
                type="button"
                onClick={centangSemua}
                className="mb-3 text-[11.5px] font-semibold underline"
                style={{ color: '#5c84ff' }}
              >
                Centang semua sudah kembali
              </button>
            )}

            <div className="mb-3 flex max-h-[34vh] flex-col gap-2 overflow-y-auto">
              {units.map((u) => {
                const isVerified = verified.has(u.unitId)
                const rusakAllowed = isVerified
                const checked = u.unitId in rusak
                return (
                  <div
                    key={u.unitId}
                    className="px-3 py-2.5 hud-clip-sm"
                    style={{
                      background: checked
                        ? 'rgba(239,68,68,0.07)'
                        : isVerified
                          ? 'rgba(34,197,94,0.05)'
                          : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${
                        checked ? 'rgba(239,68,68,0.3)' : isVerified ? 'rgba(34,197,94,0.4)' : 'rgba(99,102,241,0.14)'
                      }`,
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => toggleVerified(u.unitId)}
                        aria-pressed={isVerified}
                        title={isVerified ? 'Batalkan tanda kembali' : 'Tandai sudah kembali'}
                        className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-[12px]"
                        style={
                          isVerified
                            ? { color: '#22c55e', border: '2px solid #22c55e', background: 'rgba(34,197,94,0.12)' }
                            : { color: '#6b7785', border: '2px dashed rgba(99,102,241,0.4)' }
                        }
                      >
                        {isVerified ? <Check className="h-3.5 w-3.5" /> : ''}
                      </button>
                      <span className="min-w-0 flex-1">
                        <span className="text-[13.5px] font-semibold" style={{ color: '#e8edf2' }}>{u.nama}</span>
                        <span
                          className="ml-2 px-1.5 py-0.5 text-[11px] font-bold hud-clip-sm"
                          style={{ fontFamily: 'var(--font-orbitron), sans-serif', color: '#4ade80', background: 'rgba(34,197,94,0.12)' }}
                        >
                          {u.kode}
                        </span>
                        <span className="mt-0.5 block text-[11px]" style={{ color: isVerified ? '#4ade80' : '#6b7785' }}>
                          {isVerified ? 'Sudah dikembalikan' : 'Ketuk untuk tandai kembali (atau scan)'}
                        </span>
                      </span>
                    </div>
                    {rusakAllowed && (
                      <label className="mt-2 flex cursor-pointer items-center gap-2 pl-8 text-[12px]" style={{ color: '#8a97a3' }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleRusak(u.unitId)}
                          className="h-3.5 w-3.5 shrink-0 accent-red-500"
                        />
                        Tandai rusak
                      </label>
                    )}
                    {checked && (
                      <input
                        type="text"
                        value={rusak[u.unitId]}
                        onChange={(e) => setRusak((prev) => ({ ...prev, [u.unitId]: e.target.value }))}
                        placeholder="Catatan kerusakan (opsional)"
                        maxLength={500}
                        className="ml-8 mt-2 w-[calc(100%-2rem)] px-2.5 py-1.5 text-[12.5px] hud-clip-sm"
                        style={{ color: '#e8edf2', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(239,68,68,0.25)' }}
                      />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Kamera QR di tengah (alat scan fisik tetap jalan via listener HID) */}
            <div className="mb-3 flex flex-col items-center">
              <div className="w-full max-w-[240px]">
                <QrCameraBox onCode={handleScanCode} height={200} />
              </div>
              <p className="mt-2 text-center text-[11px]" style={{ color: '#6b7785' }}>
                Arahkan kamera ke stiker QR — alat scan fisik juga langsung terbaca
              </p>
              {scanMsg && (
                <p
                  className="mt-2 w-full px-2.5 py-1.5 text-center text-[11.5px] leading-snug hud-clip-sm"
                  role="status"
                  aria-live="polite"
                  style={
                    scanMsg.kind === 'ok'
                      ? { color: '#4ade80', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)' }
                      : { color: '#fca5a5', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }
                  }
                >
                  {scanMsg.text}
                </p>
              )}
            </div>

            <input
              type="text"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Catatan pengembalian (opsional)"
              maxLength={500}
              className="mb-3.5 w-full px-2.5 py-2 text-[12.5px] hud-clip-sm"
              style={{ color: '#e8edf2', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(99,102,241,0.2)' }}
            />

            {rusakCount > 0 && (
              <p className="mb-3 flex items-center gap-1.5 text-[12px]" style={{ color: '#f59e0b' }}>
                <AlertTriangle className="h-3.5 w-3.5" />
                {rusakCount} unit akan ditandai rusak.
              </p>
            )}

          </div>

          <div
            className="flex shrink-0 gap-2.5 p-5 pt-3"
            style={{ borderTop: '1px solid rgba(99,102,241,0.15)' }}
          >
            <button
              onClick={() => setReturnOpen(false)}
              disabled={!!loading}
              className="flex-1 px-3.5 py-2.5 text-[13px] font-semibold transition hud-clip-sm disabled:opacity-60"
              style={{ color: '#8a97a3', border: '1px solid rgba(99,102,241,0.25)' }}
            >
              Batal
            </button>
            <button
              onClick={submitReturn}
              disabled={!!loading || verified.size < units.length}
              className="flex-1 px-3.5 py-2.5 text-[13px] font-semibold transition hud-clip-sm disabled:cursor-not-allowed disabled:opacity-40"
              style={{ color: '#5c84ff', background: 'rgba(92,132,255,0.12)', border: '1px solid rgba(92,132,255,0.3)' }}
              title={verified.size < units.length ? 'Centang atau scan semua unit dulu' : undefined}
            >
              {loading === 'return' ? 'Memproses...' : 'Proses Pengembalian'}
            </button>
          </div>
        </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
