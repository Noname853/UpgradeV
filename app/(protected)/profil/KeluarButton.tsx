'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { signOut } from 'next-auth/react'
import { LogOut } from 'lucide-react'

// Tombol keluar + modal konfirmasi bergaya HUD (ikon power, cincin pulse).
// Penting di HP karena siswa tidak punya drawer/sidebar seperti admin.
export function KeluarButton({ isAdmin = false }: { isAdmin?: boolean }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  function konfirmasiKeluar() {
    setBusy(true)
    signOut({ callbackUrl: isAdmin ? '/login' : '/' })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hud-press flex w-full items-center justify-center gap-2.5 px-5 py-3.5 text-[12px] sm:w-auto"
        style={{
          fontFamily: 'var(--font-orbitron), sans-serif',
          fontWeight: 700,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          color: '#f7a8a8',
          border: '1px solid rgba(239,68,68,0.35)',
          background: 'rgba(239,68,68,0.06)',
          clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
        }}
      >
        <LogOut className="h-4 w-4" />
        Keluar
      </button>

      {open &&
        typeof window !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
            style={{ background: 'rgba(3,4,8,0.7)', animation: 'hudFadeIn 0.2s ease' }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !busy) setOpen(false)
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Konfirmasi keluar"
          >
            <div
              className="w-full max-w-[320px] text-center"
              style={{
                padding: '28px 22px',
                background: 'linear-gradient(180deg, #12131b, #0a0b10)',
                border: '1px solid rgba(239,68,68,0.3)',
                clipPath: 'polygon(18px 0, 100% 0, 100% calc(100% - 18px), calc(100% - 18px) 100%, 0 100%, 0 18px)',
              }}
            >
              {/* Ikon power + cincin pulse */}
              <div className="relative mx-auto mb-[18px]" style={{ width: 72, height: 72 }}>
                <div
                  className="absolute inset-0 rounded-full"
                  style={{ border: '2px solid #ef4444', animation: 'hudPulseRing 1.6s ease-out infinite' }}
                />
                <div
                  className="flex h-[72px] w-[72px] items-center justify-center rounded-full"
                  style={{ background: 'rgba(239,68,68,0.14)' }}
                >
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                    <path d="M12 2v10" />
                  </svg>
                </div>
              </div>

              <div className="mb-2 text-[20px] font-bold" style={{ color: '#f0f4f8' }}>Keluar dari akun?</div>
              <div className="mb-[22px] text-[13.5px] leading-relaxed" style={{ color: '#8a97a3' }}>
                Sesi kamu akan diakhiri pada perangkat ini.
              </div>

              <div className="flex gap-2.5">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setOpen(false)}
                  className="hud-press flex-1 py-3 text-[11px] disabled:opacity-50"
                  style={{
                    fontFamily: 'var(--font-orbitron), sans-serif',
                    fontWeight: 700,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                    color: '#c3ccd6',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(99,102,241,0.3)',
                    clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
                  }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={konfirmasiKeluar}
                  className="hud-press flex-1 py-3 text-[11px] disabled:opacity-60"
                  style={{
                    fontFamily: 'var(--font-orbitron), sans-serif',
                    fontWeight: 800,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                    color: '#fff',
                    background: 'linear-gradient(135deg, #dc2626, #ef4444)',
                    clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
                  }}
                >
                  {busy ? 'Keluar…' : 'Ya, Keluar'}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
