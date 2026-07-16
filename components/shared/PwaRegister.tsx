'use client'

import { useEffect } from 'react'

// Mendaftarkan service worker PWA (public/sw.js). Hanya di produksi —
// di dev, SW mengganggu hot reload dan tidak dibutuhkan.
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Gagal daftar (mis. browser lama) bukan masalah fatal — app tetap jalan.
    })
  }, [])

  return null
}
