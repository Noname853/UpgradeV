'use client'

import { useState } from 'react'
import { Lock, Unlock } from 'lucide-react'

// Saklar buka/tutup pendaftaran peminjaman (khusus admin, tampil di dashboard).
// Hanya memengaruhi metode "pilih dari daftar"; scan QR unit tetap aktif.
export function BookingToggle({ initial }: { initial: boolean }) {
  const [dibuka, setDibuka] = useState(initial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function toggle() {
    if (loading) return
    const next = !dibuka
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/pengaturan', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingDibuka: next }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Gagal menyimpan')
        return
      }
      const data = await res.json()
      setDibuka(Boolean(data.bookingDibuka))
    } catch {
      setError('Jaringan bermasalah, coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  const warna = dibuka ? '#22c55e' : '#ef4444'

  return (
    <div
      className="hud-panel hud-rise mb-[22px] flex flex-wrap items-center justify-between gap-3.5 p-[18px]"
      style={{
        background: `linear-gradient(160deg, ${warna}12, rgba(255,255,255,0.012))`,
        border: `1px solid ${warna}38`,
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="hud-hex-wide flex h-[38px] w-[38px] items-center justify-center"
          style={{ background: `${warna}22` }}
        >
          {dibuka ? (
            <Unlock className="h-4 w-4" style={{ color: warna }} />
          ) : (
            <Lock className="h-4 w-4" style={{ color: warna }} />
          )}
        </div>
        <div>
          <p className="text-[14.5px] font-semibold" style={{ color: '#fff' }}>
            Pendaftaran booking {dibuka ? 'terbuka' : 'ditutup'}
          </p>
          <p className="mt-0.5 text-[12.5px]" style={{ color: '#8a97a3' }}>
            {dibuka
              ? 'Siswa dapat mengajukan lewat pilih daftar & scan QR'
              : 'Pilih daftar diblokir — scan QR unit di lab tetap aktif'}
          </p>
          {error && (
            <p className="mt-1 text-[12px]" style={{ color: '#f87171' }}>{error}</p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={toggle}
        disabled={loading}
        role="switch"
        aria-checked={dibuka}
        aria-label="Buka atau tutup pendaftaran booking"
        className="relative shrink-0 disabled:opacity-50"
        style={{
          width: 58,
          height: 32,
          borderRadius: 999,
          border: `1px solid ${warna}55`,
          background: dibuka ? `${warna}33` : 'rgba(255,255,255,0.06)',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'background-color .2s ease',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: 2,
            width: 26,
            height: 26,
            borderRadius: 999,
            background: dibuka ? warna : '#6b7785',
            transform: dibuka ? 'translateX(26px)' : 'translateX(0)',
            transition: 'transform .2s ease, background-color .2s ease',
            boxShadow: dibuka ? `0 0 10px ${warna}99` : 'none',
          }}
        />
      </button>
    </div>
  )
}
