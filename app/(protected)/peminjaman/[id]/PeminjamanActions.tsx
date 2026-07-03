'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { CheckCircle, RotateCcw, XCircle, AlertTriangle } from 'lucide-react'

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
    doAction('return', { catatan: catatan.trim() || undefined, kerusakan })
  }

  const canVerify = isAdmin && status === 'menunggu_verifikasi'
  const canReturn = isAdmin && status === 'dipinjam'
  const canCancel = (isAdmin || isOwner) && ['menunggu_verifikasi', 'dipinjam'].includes(status)

  if (!canVerify && !canReturn && !canCancel) return null

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
            onClick={() => setReturnOpen(true)}
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
            onClick={() => {
              const alasan = prompt('Alasan pembatalan (opsional):') ?? ''
              doAction('cancel', { alasan })
            }}
            disabled={loading === 'cancel'}
            className="flex w-full items-center gap-2.5 px-3.5 py-3 text-[13.5px] font-semibold transition hud-clip-sm disabled:opacity-60"
            style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}
          >
            <XCircle className="h-4 w-4" />
            {loading === 'cancel' ? 'Membatalkan...' : 'Batalkan Peminjaman'}
          </button>
        )}
      </div>

      {returnOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: 'rgba(3,7,14,0.7)' }}
          onClick={() => !loading && setReturnOpen(false)}
        >
          <div
            className="hud-clip-md w-full max-w-md p-5"
            style={{ background: '#0d1520', border: '1px solid rgba(92,132,255,0.3)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center gap-2.5">
              <div
                className="flex h-8 w-8 items-center justify-center hud-clip-sm"
                style={{ background: 'rgba(92,132,255,0.12)', border: '1px solid rgba(92,132,255,0.3)' }}
              >
                <RotateCcw className="h-4 w-4" style={{ color: '#5c84ff' }} />
              </div>
              <h3 className="text-[15px] font-bold" style={{ color: '#e8edf2' }}>Proses Pengembalian</h3>
            </div>
            <p className="mb-3.5 text-[12.5px] leading-relaxed" style={{ color: '#8a97a3' }}>
              Centang unit yang <span style={{ color: '#ef4444' }}>rusak</span> saat dikembalikan. Unit yang dicentang
              akan ditandai rusak dan tercatat pada riwayat peminjam.
            </p>

            <div className="mb-3.5 flex max-h-[46vh] flex-col gap-2 overflow-y-auto">
              {units.map((u) => {
                const checked = u.unitId in rusak
                return (
                  <div
                    key={u.unitId}
                    className="px-3 py-2.5 hud-clip-sm"
                    style={{
                      background: checked ? 'rgba(239,68,68,0.07)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${checked ? 'rgba(239,68,68,0.3)' : 'rgba(99,102,241,0.14)'}`,
                    }}
                  >
                    <label className="flex cursor-pointer items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRusak(u.unitId)}
                        className="h-4 w-4 shrink-0 accent-red-500"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="text-[13.5px] font-semibold" style={{ color: '#e8edf2' }}>{u.nama}</span>
                        <span
                          className="ml-2 px-1.5 py-0.5 text-[11px] font-bold hud-clip-sm"
                          style={{ fontFamily: 'var(--font-orbitron), sans-serif', color: '#4ade80', background: 'rgba(34,197,94,0.12)' }}
                        >
                          {u.kode}
                        </span>
                      </span>
                    </label>
                    {checked && (
                      <input
                        type="text"
                        value={rusak[u.unitId]}
                        onChange={(e) => setRusak((prev) => ({ ...prev, [u.unitId]: e.target.value }))}
                        placeholder="Catatan kerusakan (opsional)"
                        maxLength={500}
                        className="mt-2 w-full px-2.5 py-1.5 text-[12.5px] hud-clip-sm"
                        style={{ color: '#e8edf2', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(239,68,68,0.25)' }}
                      />
                    )}
                  </div>
                )
              })}
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

            <div className="flex gap-2.5">
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
                disabled={!!loading}
                className="flex-1 px-3.5 py-2.5 text-[13px] font-semibold transition hud-clip-sm disabled:opacity-60"
                style={{ color: '#5c84ff', background: 'rgba(92,132,255,0.12)', border: '1px solid rgba(92,132,255,0.3)' }}
              >
                {loading === 'return' ? 'Memproses...' : 'Proses Pengembalian'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
