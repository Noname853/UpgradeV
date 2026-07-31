'use client'

import { createPortal } from 'react-dom'
import { Bell, FileText, AlertTriangle, X, Check } from 'lucide-react'
import type { CatatanBelumDibaca } from './CatatanAdminBanner'

type Tipe = 'catatan' | 'rusak'
interface Notif {
  key: string
  tipe: Tipe
  title: string
  meta: string | null
  msg: string
}

const GAYA: Record<Tipe, { color: string; bg: string; bd: string }> = {
  catatan: { color: '#5c84ff', bg: 'rgba(92,132,255,0.12)', bd: 'rgba(92,132,255,0.32)' },
  rusak: { color: '#ef4444', bg: 'rgba(239,68,68,0.10)', bd: 'rgba(239,68,68,0.30)' },
}

// Susun kartu notifikasi dari daftar catatan pengembalian yang belum dibaca.
export function buildNotifs(items: CatatanBelumDibaca[]): Notif[] {
  const notifs: Notif[] = []
  for (const it of items) {
    if (it.catatan) {
      notifs.push({
        key: `c${it.id}`,
        tipe: 'catatan',
        title: 'Catatan dari admin',
        meta: it.tanggalKembali,
        msg: `${it.alat}: ${it.catatan}`,
      })
    }
    for (const k of it.kerusakan) {
      notifs.push({
        key: `r${it.id}-${k.kode}`,
        tipe: 'rusak',
        title: 'Laporan kerusakan',
        meta: it.tanggalKembali,
        msg: `${k.kode}: ${k.catatan}`,
      })
    }
  }
  return notifs
}

interface Props {
  open: boolean
  items: CatatanBelumDibaca[]
  busy?: boolean
  onClose: () => void
  onMarkAll: () => void
}

// Bottom sheet notifikasi (terkontrol). Dipakai oleh popup auto-login maupun
// tombol lonceng di app bar.
export function NotifikasiSheet({ open, items, busy = false, onClose, onMarkAll }: Props) {
  if (!open || typeof window === 'undefined') return null

  const notifs = buildNotifs(items)

  return createPortal(
    <div
      className="fixed inset-0 z-[9998] flex items-end justify-center"
      style={{ background: 'rgba(3,4,8,0.7)', animation: 'hudFadeIn 0.2s ease' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Notifikasi"
    >
      <div className="hud-sheet flex max-h-[82%] w-full max-w-[440px] flex-col">
        <div className="hud-sheet-handle" />

        <div className="mb-4 flex flex-none items-center gap-2.5">
          <div
            className="flex items-center justify-center hud-hex-wide"
            style={{ width: 34, height: 38, background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.35)', color: '#eab308' }}
          >
            <Bell className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="hud-title" style={{ fontSize: 15, letterSpacing: 0.5 }}>Notifikasi</div>
            <div className="mt-0.5 text-[11.5px]" style={{ color: '#8a97a3' }}>Info peminjamanmu</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded hover:bg-white/5"
            style={{ color: '#8a97a3' }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
          {notifs.map((n) => {
            const g = GAYA[n.tipe]
            return (
              <div
                key={n.key}
                className="px-3.5 py-3"
                style={{
                  background: 'rgba(255,255,255,0.025)',
                  border: '1px solid rgba(99,102,241,0.14)',
                  borderLeft: `2px solid ${g.color}`,
                  clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%)',
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex shrink-0 items-center justify-center hud-clip-sm"
                    style={{ width: 34, height: 34, color: g.color, background: g.bg, border: `1px solid ${g.bd}` }}
                  >
                    {n.tipe === 'catatan' ? <FileText className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <div className="min-w-0 flex-1 truncate text-[14px] font-bold" style={{ color: '#e8edf2' }}>
                        {n.title}
                      </div>
                      {n.meta && (
                        <span className="shrink-0" style={{ fontFamily: 'var(--font-orbitron), sans-serif', fontSize: 10, fontWeight: 600, color: '#6b7785' }}>
                          {n.meta}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-[12.5px] leading-relaxed" style={{ color: '#8a97a3' }}>{n.msg}</div>
                  </div>
                </div>
              </div>
            )
          })}

          {notifs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center" style={{ color: '#6b7785' }}>
              <Bell className="mb-2 h-9 w-9" />
              <p className="text-[13.5px]">Tidak ada notifikasi</p>
            </div>
          )}
        </div>

        {notifs.length > 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={onMarkAll}
            className="hud-btn-primary mt-4 flex flex-none items-center justify-center gap-2 py-3 text-[12px] disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            {busy ? 'MENYIMPAN…' : 'TANDAI SEMUA SUDAH DIBACA'}
          </button>
        )}
      </div>
    </div>,
    document.body,
  )
}
