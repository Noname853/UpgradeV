'use client'

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'
import { TOURS, tourKeyFor, type TourStep } from '@/lib/tours'

interface Box {
  t: number
  l: number
  w: number
  h: number
}

// Elemen dianggap "ada" hanya jika benar-benar terlihat (punya ukuran).
// Ini membuat satu tur bisa memuat langkah mobile & desktop sekaligus:
// yang tersembunyi (mis. bottom-nav di desktop / sidebar di mobile) otomatis dilewati.
function isVisible(selector: string): boolean {
  const el = document.querySelector(selector)
  if (!el) return false
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.height > 0
}

// Tur panduan buatan sendiri (tanpa library luar): sorot elemen + kotak
// penjelasan. Muncul sekali per tur (localStorage) di HP, bisa diputar ulang
// lewat event 'replay-tour' (tombol ? di app bar).
export function PageTour({ role }: { role?: string }) {
  const pathname = usePathname()
  const key = tourKeyFor(pathname, role)

  const [active, setActive] = useState(false)
  const [steps, setSteps] = useState<TourStep[]>([])
  const [i, setI] = useState(0)
  const [box, setBox] = useState<Box | null>(null)

  const start = useCallback(() => {
    if (!key) return
    const all = TOURS[key] ?? []
    const present = all.filter((s) => !s.element || isVisible(s.element))
    // Jangan mulai kalau tak ada satu pun langkah dengan elemen terlihat
    // (mencegah tur "kotak kosong" hanya berisi intro di layar yang tak cocok).
    if (!present.some((s) => s.element)) return
    setSteps(present)
    setI(0)
    setActive(true)
  }, [key])

  // Auto-muncul sekali + dengarkan tombol "?" untuk mengulang.
  // Auto hanya jalan bila ada langkah dengan elemen yang benar-benar terlihat
  // (jadi di layar yang tidak cocok, tur tidak muncul cuma sbg kotak kosong).
  useEffect(() => {
    if (!key) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const doneKey = `tour-done:${key}`
    let seen = false
    try {
      seen = !!localStorage.getItem(doneKey)
    } catch {}
    if (!seen) {
      timer = setTimeout(() => {
        const hasVisibleStep = (TOURS[key] ?? []).some((s) => s.element && isVisible(s.element))
        if (hasVisibleStep) start()
      }, 700)
    }
    function onReplay() {
      start()
    }
    window.addEventListener('replay-tour', onReplay)
    return () => {
      if (timer) clearTimeout(timer)
      window.removeEventListener('replay-tour', onReplay)
    }
  }, [key, start])

  // Hitung posisi sorotan untuk step aktif; ikuti scroll/resize.
  useEffect(() => {
    if (!active) return
    const step = steps[i]
    if (!step) return

    function place() {
      if (!step || !step.element) {
        setBox(null)
        return
      }
      const el = document.querySelector(step.element)
      if (!el) {
        setBox(null)
        return
      }
      const r = el.getBoundingClientRect()
      const pad = 6
      setBox({ t: r.top - pad, l: r.left - pad, w: r.width + pad * 2, h: r.height + pad * 2 })
    }

    if (step.element) {
      const el = document.querySelector(step.element)
      if (el) el.scrollIntoView({ block: 'center' })
    }
    const raf = requestAnimationFrame(place)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [active, i, steps])

  const finish = useCallback(() => {
    setActive(false)
    if (key) {
      try {
        localStorage.setItem(`tour-done:${key}`, '1')
      } catch {}
    }
  }, [key])

  if (!active || typeof window === 'undefined') return null
  const step = steps[i]
  if (!step) return null

  const vw = window.innerWidth
  const vh = window.innerHeight
  const tipW = Math.min(300, vw - 24)
  let tipL: number
  let tipT: number
  if (box) {
    tipL = Math.min(Math.max(12, box.l), vw - tipW - 12)
    tipT = box.t + box.h + 170 < vh ? box.t + box.h + 12 : Math.max(12, box.t - 168)
  } else {
    tipL = (vw - tipW) / 2
    tipT = vh / 2 - 90
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000 }} role="dialog" aria-modal="true">
      {box ? (
        <div
          style={{
            position: 'fixed',
            top: box.t,
            left: box.l,
            width: box.w,
            height: box.h,
            borderRadius: 8,
            border: '2px solid #5c84ff',
            boxShadow: '0 0 0 9999px rgba(3,4,8,0.75), 0 0 16px rgba(92,132,255,0.6)',
            pointerEvents: 'none',
            transition: 'top .25s ease, left .25s ease, width .25s ease, height .25s ease',
          }}
        />
      ) : (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(3,4,8,0.75)' }} />
      )}

      <div
        style={{
          position: 'fixed',
          top: tipT,
          left: tipL,
          width: tipW,
          background: '#12141d',
          border: '1px solid rgba(92,132,255,0.45)',
          borderRadius: 10,
          padding: 14,
          boxShadow: '0 12px 34px rgba(0,0,0,0.55)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
          <span style={{ fontSize: 10, letterSpacing: 1, color: '#5c84ff' }}>{i + 1} / {steps.length}</span>
          <button onClick={finish} style={{ fontSize: 11, color: '#6b7785', background: 'none', border: 'none', cursor: 'pointer' }}>
            Lewati
          </button>
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#f0f4f8', marginBottom: 5 }}>{step.title}</div>
        <div style={{ fontSize: 12.5, color: '#9fb0d8', lineHeight: 1.6, marginBottom: 12 }}>{step.text}</div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {i > 0 && (
            <button
              onClick={() => setI((v) => v - 1)}
              style={{ fontSize: 12, padding: '7px 12px', borderRadius: 7, border: '1px solid rgba(99,102,241,0.35)', background: 'transparent', color: '#c3ccd6', cursor: 'pointer' }}
            >
              Kembali
            </button>
          )}
          <button
            onClick={() => (i < steps.length - 1 ? setI((v) => v + 1) : finish())}
            style={{ fontSize: 12, padding: '7px 14px', borderRadius: 7, border: 'none', background: 'linear-gradient(135deg,#2563eb,#9333ea)', color: '#fff', cursor: 'pointer' }}
          >
            {i < steps.length - 1 ? 'Lanjut' : 'Selesai'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
