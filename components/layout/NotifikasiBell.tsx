'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { NotifikasiSheet } from '@/components/dashboard/NotifikasiSheet'
import type { CatatanBelumDibaca } from '@/components/dashboard/CatatanAdminBanner'

const CLIP =
  'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)'

// Tombol lonceng di app bar. Mengambil notifikasi siswa dari API, menampilkan
// badge jumlah, dan membuka bottom sheet notifikasi saat diketuk.
export function NotifikasiBell() {
  const [items, setItems] = useState<CatatanBelumDibaca[]>([])
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const pathname = usePathname()

  // Muat ulang saat berpindah rute supaya badge selalu segar (mis. setelah
  // membuka detail yang menandai catatan terbaca).
  useEffect(() => {
    let aktif = true
    fetch('/api/notifikasi')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (aktif && d?.items) setItems(d.items as CatatanBelumDibaca[])
      })
      .catch(() => {})
    return () => {
      aktif = false
    }
  }, [pathname])

  async function tandaiSemuaDibaca() {
    setBusy(true)
    try {
      await Promise.all(
        items.map((it) =>
          fetch(`/api/peminjaman/${it.id}/baca-catatan`, { method: 'POST' }).catch(() => {}),
        ),
      )
    } finally {
      setBusy(false)
      setItems([])
      setOpen(false)
    }
  }

  const count = items.length

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Notifikasi${count ? ` (${count})` : ''}`}
        className="hud-press relative flex h-10 w-10 flex-none items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(99,102,241,0.16)', color: '#c3ccd6', clipPath: CLIP }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {count > 0 && (
          <span
            className="absolute flex items-center justify-center"
            style={{ top: 4, right: 4, minWidth: 15, height: 15, padding: '0 3px', fontFamily: 'var(--font-orbitron), sans-serif', fontSize: 8, fontWeight: 800, color: '#0b0c12', background: '#eab308', borderRadius: 8, boxShadow: '0 0 8px rgba(234,179,8,0.7)' }}
          >
            {count}
          </span>
        )}
      </button>

      <NotifikasiSheet
        open={open}
        items={items}
        busy={busy}
        onClose={() => setOpen(false)}
        onMarkAll={tandaiSemuaDibaca}
      />
    </>
  )
}
