'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Camera, AlertCircle } from 'lucide-react'
import type { Html5Qrcode } from 'html5-qrcode'

interface Props {
  // Dipanggil setiap QR terbaca. Dedup kode yang sama dalam 2,5 dtk sudah
  // ditangani di sini; validasi isi kode urusan pemakai.
  onCode: (kode: string) => void
  // Tinggi area kamera (px). Default cukup untuk dialog kecil.
  height?: number
}

// Kotak kamera pemindai QR yang bisa dipakai ulang (html5-qrcode, pure JS —
// lolos CSP tanpa wasm/worker). Kamera hidup selama komponen ter-mount;
// render kondisional dari pemakai yang mengatur nyala/matinya.
export function QrCameraBox({ onCode, height = 180 }: Props) {
  const regionId = useId().replace(/[^a-zA-Z0-9_-]/g, '') + '-qr-region'
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const lastRef = useRef<{ kode: string; at: number }>({ kode: '', at: 0 })
  const onCodeRef = useRef(onCode)

  useEffect(() => {
    onCodeRef.current = onCode
  }, [onCode])

  useEffect(() => {
    let cancelled = false
    let scanner: Html5Qrcode | null = null

    async function start() {
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        if (cancelled) return
        setError('')
        setReady(false)
        scanner = new Html5Qrcode(regionId, { verbose: false })
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 200, height: 200 } },
          (decoded) => {
            const kode = decoded.trim()
            const now = Date.now()
            if (lastRef.current.kode === kode.toLowerCase() && now - lastRef.current.at < 2500) return
            lastRef.current = { kode: kode.toLowerCase(), at: now }
            onCodeRef.current(kode)
          },
          () => {
            /* frame tanpa QR: abaikan */
          },
        )
        if (cancelled) return
        setReady(true)
      } catch {
        if (cancelled) return
        setError(
          typeof window !== 'undefined' && window.isSecureContext
            ? 'Kamera tidak tersedia atau izin ditolak — pakai alat scan / ketik manual.'
            : 'Kamera butuh HTTPS — pakai alat scan / ketik manual.',
        )
      }
    }
    start()

    return () => {
      cancelled = true
      const s = scanner
      if (s) {
        // stop() melempar SINKRON bila kamera tidak pernah jalan — tanpa
        // try/catch, error lolos dari cleanup dan meruntuhkan root React.
        try {
          s.stop().catch(() => {}).finally(() => {
            try {
              s.clear()
            } catch {
              /* elemen sudah dilepas React */
            }
          })
        } catch {
          try {
            s.clear()
          } catch {
            /* scanner belum sempat render apa pun */
          }
        }
      }
    }
    // regionId stabil selama mount; efek sengaja hanya jalan sekali.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      className="relative overflow-hidden hud-clip-sm"
      style={{ background: '#05070a', border: '1px solid rgba(99,102,241,0.25)', minHeight: height }}
    >
      <div id={regionId} />
      {!ready && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
          <Camera className="h-5 w-5" style={{ color: '#5d717d' }} />
          <p className="text-[11.5px]" style={{ color: '#6b7785' }}>Menyalakan kamera…</p>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-5 text-center">
          <AlertCircle className="h-5 w-5" style={{ color: '#eab308' }} />
          <p className="text-[11.5px] leading-relaxed" style={{ color: '#c3ccd6' }}>{error}</p>
        </div>
      )}
    </div>
  )
}
