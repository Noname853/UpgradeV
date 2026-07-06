'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MessageSquare, Check } from 'lucide-react'

export interface CatatanBelumDibaca {
  id: number
  catatan: string
  tanggalKembali: string | null // sudah diformat di server
  alat: string
}

// Banner di dashboard siswa: daftar catatan pengembalian dari admin yang
// belum dibaca. "Tandai dibaca" menyimpan status ke server dan mengeluarkan
// item dari daftar; saat kosong, tampil konfirmasi singkat.
export function CatatanAdminBanner({ items: initial }: { items: CatatanBelumDibaca[] }) {
  const [items, setItems] = useState(initial)
  const [selesai, setSelesai] = useState(false)

  if (items.length === 0 && !selesai) return null

  async function tandaiDibaca(id: number) {
    // Optimistis: keluarkan dulu, kembalikan bila server menolak.
    const sebelum = items
    const sisa = items.filter((it) => it.id !== id)
    setItems(sisa)
    if (sisa.length === 0) setSelesai(true)
    try {
      const res = await fetch(`/api/peminjaman/${id}/baca-catatan`, { method: 'POST' })
      if (!res.ok) throw new Error()
    } catch {
      setItems(sebelum)
      setSelesai(false)
    }
  }

  if (items.length === 0) {
    return (
      <div
        className="mb-[22px] flex items-center gap-2.5 px-4 py-3 hud-clip-sm hud-rise"
        style={{ color: '#4ade80', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.35)' }}
      >
        <Check className="h-4 w-4 shrink-0" />
        <p className="text-[13px]">Semua catatan dari admin sudah dibaca</p>
      </div>
    )
  }

  return (
    <div
      className="hud-panel hud-rise mb-[22px] p-[18px]"
      style={{
        border: '1px solid rgba(92,132,255,0.45)',
        background: 'linear-gradient(160deg, rgba(92,132,255,0.1), rgba(147,51,234,0.05))',
      }}
    >
      <div className="mb-3 flex items-center gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center hud-clip-sm"
          style={{ background: 'rgba(92,132,255,0.15)', border: '1px solid rgba(92,132,255,0.4)' }}
        >
          <MessageSquare className="h-4 w-4" style={{ color: '#5c84ff' }} />
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold" style={{ color: '#fff' }}>
            Kamu punya {items.length} catatan dari admin
          </p>
          <p className="text-[12px]" style={{ color: '#8a97a3' }}>
            Catatan dari pengembalian alat yang belum kamu baca
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {items.map((it) => (
          <div
            key={it.id}
            className="flex flex-wrap items-start gap-3 px-3.5 py-3 hud-clip-sm"
            style={{ background: 'rgba(13,17,23,0.6)', border: '1px solid rgba(99,102,241,0.16)' }}
          >
            <div className="min-w-0 flex-1" style={{ minWidth: 200 }}>
              <Link
                href={`/peminjaman/${it.id}`}
                className="text-[13px] font-semibold hover:underline"
                style={{ color: '#e8edf2' }}
              >
                Peminjaman #{it.id} · {it.alat}
              </Link>
              <p className="mt-1 text-[12.5px] leading-relaxed" style={{ color: '#b3bdc7' }}>
                &ldquo;{it.catatan}&rdquo;
              </p>
              {it.tanggalKembali && (
                <p className="mt-1 text-[11px]" style={{ color: '#6b7785' }}>Dikembalikan {it.tanggalKembali}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => tandaiDibaca(it.id)}
              className="shrink-0 hud-clip-sm px-3 py-1.5 text-[11.5px] font-semibold"
              style={{ color: '#5c84ff', border: '1px solid rgba(92,132,255,0.4)', background: 'rgba(92,132,255,0.1)' }}
            >
              Tandai dibaca
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
