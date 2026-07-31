'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Trash2 } from 'lucide-react'

// Tombol siswa: sembunyikan peminjaman selesai/batal dari riwayatnya sendiri.
// Data tetap ada di sistem & terlihat admin.
export function HapusRiwayatButton({ id }: { id: number }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function hapus(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (busy) return
    // Langsung proses tanpa konfirmasi — cukup diproses di backend.
    setBusy(true)
    try {
      const res = await fetch(`/api/peminjaman/${id}/sembunyikan`, { method: 'POST' })
      if (res.ok) {
        router.refresh()
      } else {
        setBusy(false)
      }
    } catch {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={hapus}
      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-semibold hud-clip-sm disabled:opacity-50"
      style={{ color: '#f7a8a8', border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.06)' }}
    >
      <Trash2 className="h-3.5 w-3.5" />
      {busy ? 'Menyembunyikan…' : 'Hapus dari riwayat'}
    </button>
  )
}
