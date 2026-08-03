'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'

// Pagination ringkas (Opsi F): tombol Sebelumnya/Berikutnya + dropdown untuk
// loncat ke halaman mana pun. Tidak menumpuk berapa pun jumlah halaman.
// `hrefs` berisi URL tiap halaman (index 0 = halaman 1) supaya logika query
// tetap di server; komponen ini hanya menavigasi.
export function Pagination({ page, pages, hrefs }: { page: number; pages: number; hrefs: string[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  if (pages <= 1) return null

  const prevHref = page > 1 ? hrefs[page - 2] : null
  const nextHref = page < pages ? hrefs[page] : null

  const arrowActive = { color: '#c3ccd6', border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(255,255,255,0.03)' }
  const arrowOff = { color: '#4b5563', border: '1px solid rgba(99,102,241,0.12)', pointerEvents: 'none' as const }

  return (
    <div className="mt-[18px] flex items-center justify-center gap-2">
      {prevHref ? (
        <Link href={prevHref} aria-label="Halaman sebelumnya" className="flex h-10 w-10 items-center justify-center hud-clip-sm transition" style={arrowActive}>
          <ChevronLeft className="h-4 w-4" />
        </Link>
      ) : (
        <span aria-disabled className="flex h-10 w-10 items-center justify-center hud-clip-sm" style={arrowOff}>
          <ChevronLeft className="h-4 w-4" />
        </span>
      )}

      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex h-10 min-w-[150px] items-center justify-between gap-2 px-3.5 text-[13px] hud-clip-sm"
          style={{ color: '#e8edf2', border: '1px solid rgba(92,132,255,0.4)', background: 'rgba(255,255,255,0.04)' }}
        >
          <span>
            Halaman {page} <span style={{ color: '#6b7785' }}>/ {pages}</span>
          </span>
          <ChevronDown className="h-4 w-4" style={{ color: '#5c84ff', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
        </button>
        {open && (
          <div
            role="listbox"
            className="absolute bottom-full left-0 z-40 mb-2 max-h-[240px] w-full overflow-y-auto hud-clip-sm"
            style={{ background: '#0f1017', border: '1px solid rgba(99,102,241,0.3)', boxShadow: '0 -8px 24px rgba(0,0,0,0.4)' }}
          >
            {hrefs.map((href, i) => {
              const p = i + 1
              const active = p === page
              return (
                <Link
                  key={p}
                  href={href}
                  role="option"
                  aria-selected={active}
                  onClick={() => setOpen(false)}
                  className="block px-3.5 py-2.5 text-[13px]"
                  style={active ? { color: '#fff', background: 'linear-gradient(135deg,#2563eb,#9333ea)' } : { color: '#c3ccd6' }}
                >
                  Halaman {p}
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {nextHref ? (
        <Link href={nextHref} aria-label="Halaman berikutnya" className="flex h-10 w-10 items-center justify-center hud-clip-sm transition" style={arrowActive}>
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span aria-disabled className="flex h-10 w-10 items-center justify-center hud-clip-sm" style={arrowOff}>
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </div>
  )
}
