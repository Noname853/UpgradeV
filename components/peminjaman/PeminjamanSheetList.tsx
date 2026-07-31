'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Clock, Check, RefreshCw, MessageSquare } from 'lucide-react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { HapusRiwayatButton } from '@/components/peminjaman/HapusRiwayatButton'
import { formatDate, formatDateTime } from '@/lib/utils'

export interface SheetItem {
  id: number
  status: string
  userName: string
  userKelas: string | null
  alatLabel: string
  totalItems: number
  tanggalPinjam: string
  tanggalKembali: string | null
  tanggalBatasKembali: string | null
  catatanAdmin: string | null
}

const STATUS_HEX: Record<string, string> = {
  menunggu_verifikasi: '#eab308',
  dipinjam: '#3b82f6',
  dikembalikan: '#22c55e',
  dibatalkan: '#ef4444',
}

function Row({ label, value, warna }: { label: string; value: string; warna?: string }) {
  return (
    <div
      className="flex items-center justify-between gap-3 px-3.5 py-3 hud-clip-sm"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(99,102,241,0.14)' }}
    >
      <span className="text-[13px]" style={{ color: '#8a97a3' }}>{label}</span>
      <span className="text-[13.5px] font-bold" style={{ color: warna ?? '#e8edf2' }}>{value}</span>
    </div>
  )
}

// Daftar kartu peminjaman (mobile) + bottom sheet detail. Ketuk kartu → sheet
// muncul dengan detail & aksi sesuai status/peran.
export function PeminjamanSheetList({ items, isAdmin }: { items: SheetItem[]; isAdmin: boolean }) {
  const router = useRouter()
  const [openId, setOpenId] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const current = items.find((p) => p.id === openId) ?? null

  async function aksi(action: 'verify' | 'cancel' | 'return') {
    if (!current || busy) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/peminjaman/${current.id}/${action}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (res.ok) {
        setOpenId(null)
        router.refresh()
      } else {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? 'Terjadi kesalahan')
      }
    } catch {
      setError('Jaringan bermasalah, coba lagi.')
    } finally {
      setBusy(false)
    }
  }

  function close() {
    if (busy) return
    setOpenId(null)
    setError('')
  }

  return (
    <>
      <div className="flex flex-col gap-2.5 md:hidden">
        {items.map((p) => (
          <div key={p.id} className="hud-panel p-4" style={{ borderLeft: `3px solid ${STATUS_HEX[p.status] ?? '#6b7785'}` }}>
            <button type="button" onClick={() => setOpenId(p.id)} className="block w-full text-left">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span style={{ fontFamily: 'var(--font-orbitron), sans-serif', fontSize: 13, fontWeight: 700, color: '#8a97a3' }}>#{p.id}</span>
                <StatusBadge status={p.status} />
              </div>
              {isAdmin ? (
                <>
                  <p className="text-[15px] font-bold" style={{ color: '#e8edf2' }}>
                    {p.userName}
                    {p.userKelas && <span className="text-[11px] font-medium" style={{ color: '#6b7785' }}> · {p.userKelas}</span>}
                  </p>
                  <p className="mt-1 text-[12.5px]" style={{ color: '#c3ccd6' }}>{p.alatLabel}</p>
                </>
              ) : (
                <p className="text-[15px] font-bold" style={{ color: '#e8edf2' }}>{p.alatLabel}</p>
              )}
              <p className="mt-1 flex items-center gap-1.5 text-[12px]" style={{ color: '#8a97a3' }}>
                <Clock className="h-3.5 w-3.5" /> Pinjam {formatDateTime(p.tanggalPinjam)} · {p.totalItems} item
              </p>
              {p.status === 'dikembalikan' && p.tanggalKembali && (
                <p className="mt-1 flex items-center gap-1.5 text-[12px]" style={{ color: '#4ade80' }}>
                  <Check className="h-3.5 w-3.5" /> Kembali {formatDateTime(p.tanggalKembali)}
                </p>
              )}
            </button>
            {!isAdmin && (p.status === 'dikembalikan' || p.status === 'dibatalkan') && <HapusRiwayatButton id={p.id} />}
          </div>
        ))}
        {items.length === 0 && (
          <div className="hud-panel flex flex-col items-center justify-center py-12" style={{ color: '#6b7785' }}>
            <p>Tidak ada peminjaman</p>
          </div>
        )}
      </div>

      {current &&
        typeof window !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[9998] flex items-end justify-center md:hidden"
            style={{ background: 'rgba(3,4,8,0.7)', animation: 'hudFadeIn 0.2s ease' }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) close()
            }}
            role="dialog"
            aria-modal="true"
            aria-label={`Detail peminjaman #${current.id}`}
          >
            <div className="hud-sheet flex max-h-[88%] w-full max-w-[440px] flex-col">
              <div className="hud-sheet-handle" />

              {/* header */}
              <div className="mb-1 flex flex-none items-center justify-between gap-2">
                <span style={{ fontFamily: 'var(--font-orbitron), sans-serif', fontSize: 12, fontWeight: 700, letterSpacing: 1, color: '#8a97a3' }}>
                  PEMINJAMAN #{current.id}
                </span>
                <StatusBadge status={current.status} />
              </div>
              <p className="text-[20px] font-bold" style={{ color: '#f0f4f8' }}>
                {isAdmin ? current.userName : current.alatLabel}
              </p>
              <p className="mb-4 text-[13.5px]" style={{ color: '#8a97a3' }}>
                {current.alatLabel} · {formatDate(current.tanggalPinjam)}
              </p>

              <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
                {isAdmin && <Row label="Peminjam" value={current.userName} />}
                <Row label="Jumlah item" value={String(current.totalItems)} />
                <Row label="Waktu pinjam" value={formatDateTime(current.tanggalPinjam)} />
                {current.tanggalBatasKembali && (
                  <Row label="Batas kembali" value={formatDateTime(current.tanggalBatasKembali)} warna="#eab308" />
                )}
                {current.status === 'dikembalikan' && current.tanggalKembali && (
                  <Row label="Dikembalikan" value={formatDateTime(current.tanggalKembali)} warna="#4ade80" />
                )}

                {isAdmin && current.catatanAdmin && (
                  <div className="mt-1">
                    <p className="hud-label mb-1.5 flex items-center gap-1.5 text-[10px]" style={{ color: '#5c84ff' }}>
                      <MessageSquare className="h-3.5 w-3.5" /> Catatan dari Admin
                    </p>
                    <p
                      className="px-3.5 py-2.5 text-[12.5px] leading-relaxed hud-clip-sm"
                      style={{ color: '#c3ccd6', background: 'rgba(92,132,255,0.06)', border: '1px solid rgba(92,132,255,0.25)' }}
                    >
                      {current.catatanAdmin}
                    </p>
                  </div>
                )}
              </div>

              {error && (
                <p className="mt-3 px-3 py-2 text-[12.5px] hud-clip-sm" style={{ color: '#fca5a5', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>
                  {error}
                </p>
              )}

              {/* aksi admin per status */}
              {isAdmin && current.status === 'menunggu_verifikasi' && (
                <div className="mt-4 flex flex-none gap-2.5">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => aksi('cancel')}
                    className="hud-btn-danger flex-1 py-3 text-[12px] disabled:opacity-50"
                  >
                    Tolak
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => aksi('verify')}
                    className="flex-1 py-3 text-[12px] font-bold disabled:opacity-50"
                    style={{ fontFamily: 'var(--font-orbitron), sans-serif', letterSpacing: 1, textTransform: 'uppercase', color: '#fff', background: 'linear-gradient(135deg,#16a34a,#22c55e)', clipPath: 'polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)' }}
                  >
                    {busy ? '…' : 'Setujui'}
                  </button>
                </div>
              )}
              {isAdmin && current.status === 'dipinjam' && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => aksi('return')}
                  className="mt-4 flex flex-none items-center justify-center gap-2 py-3 text-[12px] font-bold disabled:opacity-50"
                  style={{ fontFamily: 'var(--font-orbitron), sans-serif', letterSpacing: 1, textTransform: 'uppercase', color: '#fff', background: 'linear-gradient(135deg,#16a34a,#22c55e)', clipPath: 'polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)' }}
                >
                  <RefreshCw className="h-4 w-4" />
                  {busy ? 'Memproses…' : 'Tandai Dikembalikan'}
                </button>
              )}

              {isAdmin && current.status === 'dipinjam' && (
                <Link
                  href={`/peminjaman/${current.id}`}
                  className="mt-2.5 flex-none text-center text-[11.5px] font-semibold"
                  style={{ color: '#5c84ff' }}
                >
                  Buka detail lengkap (kembalikan dengan tanda kerusakan) →
                </Link>
              )}

              <button
                type="button"
                onClick={close}
                disabled={busy}
                className="mt-2.5 flex-none py-2.5 text-[12px] font-semibold hud-clip-sm disabled:opacity-50"
                style={{ color: '#8a97a3', border: '1px solid rgba(99,102,241,0.25)' }}
              >
                Tutup
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
