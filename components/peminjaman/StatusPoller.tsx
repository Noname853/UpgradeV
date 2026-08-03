'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

function sign(items: { id: number; status: string }[]) {
  return items
    .map((i) => `${i.id}:${i.status}`)
    .sort()
    .join(',')
}

// Polling status peminjaman siswa agar perubahan (mis. admin menyetujui) tampil
// tanpa refresh manual. Dibuat terpisah & tak menampilkan UI, supaya saat pindah
// ke server sendiri cukup ganti isi efek ini dari fetch+interval menjadi
// EventSource (SSE) tanpa menyentuh halaman.
//
// Redaman beban server: berhenti saat tab tidak aktif, berhenti (tidak nge-loop)
// saat sesi habis (401), dan hanya me-refresh bila ada status yang benar-benar
// berubah — bukan tiap tick.
export function StatusPoller({ intervalMs = 10_000 }: { intervalMs?: number }) {
  const router = useRouter()
  const sigRef = useRef<string | null>(null)

  useEffect(() => {
    let stopped = false
    let timer: ReturnType<typeof setTimeout> | null = null

    async function tick() {
      if (stopped || document.hidden) return
      try {
        const res = await fetch('/api/peminjaman/status', { cache: 'no-store' })
        if (res.status === 401) {
          stopped = true // sesi habis — hentikan agar tidak membanjiri 401
          return
        }
        if (!res.ok) return
        const data = await res.json()
        const next = sign(data.items ?? [])
        if (sigRef.current === null) {
          // Baseline pertama — jangan refresh, cukup catat kondisi awal.
          sigRef.current = next
        } else if (next !== sigRef.current) {
          sigRef.current = next
          router.refresh()
        }
      } catch {
        // Abaikan gangguan jaringan sesaat; tick berikutnya mencoba lagi.
      }
    }

    function schedule() {
      timer = setTimeout(async () => {
        await tick()
        if (!stopped) schedule()
      }, intervalMs)
    }

    function onVisible() {
      if (!document.hidden) void tick()
    }

    document.addEventListener('visibilitychange', onVisible)
    schedule()

    return () => {
      stopped = true
      if (timer) clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [router, intervalMs])

  return null
}
