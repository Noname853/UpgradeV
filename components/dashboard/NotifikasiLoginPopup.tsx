'use client'

import { useEffect, useState } from 'react'
import { NotifikasiSheet } from './NotifikasiSheet'
import type { CatatanBelumDibaca } from './CatatanAdminBanner'

// Popup notifikasi yang muncul otomatis saat siswa pertama kali login (sekali
// per sesi untuk kumpulan catatan yang sama). Data dari server (dashboard).
export function NotifikasiLoginPopup({ items }: { items: CatatanBelumDibaca[] }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  // Tanda unik dari kumpulan id catatan: catatan baru → tampil lagi; set yang
  // sama yang sudah tampil di sesi ini → dilewati.
  const sig = items.map((i) => i.id).sort((a, b) => a - b).join(',')

  useEffect(() => {
    if (items.length === 0) return
    const kunci = 'notif-login-shown:' + sig
    try {
      if (sessionStorage.getItem(kunci)) return
      sessionStorage.setItem(kunci, '1')
    } catch {
      /* sessionStorage tidak tersedia: tetap tampilkan */
    }
    // Tunda buka ke tick berikutnya agar tidak setState sinkron di dalam effect.
    const t = setTimeout(() => setOpen(true), 0)
    return () => clearTimeout(t)
  }, [sig, items.length])

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
      setOpen(false)
    }
  }

  return (
    <NotifikasiSheet
      open={open}
      items={items}
      busy={busy}
      onClose={() => setOpen(false)}
      onMarkAll={tandaiSemuaDibaca}
    />
  )
}
