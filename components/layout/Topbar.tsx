'use client'

import { Menu } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { tourKeyFor } from '@/lib/tours'

interface TopbarProps {
  onMenuToggle?: () => void
  role?: string
}

function crumbFromPath(pathname: string): string {
  const seg = pathname.split('/').filter(Boolean)[0] ?? 'dashboard'
  return seg.replace(/-/g, ' ').toUpperCase()
}

export function Topbar({ onMenuToggle, role }: TopbarProps) {
  const pathname = usePathname()
  const hasTour = tourKeyFor(pathname, role) !== null

  return (
    <header
      className="sticky top-0 z-40 flex h-16 items-center px-4 md:px-[26px]"
      style={{
        background: 'rgba(8,9,12,0.82)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(99,102,241,0.16)',
      }}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          aria-label="Buka menu"
          className="text-neutral-400 hover:text-white md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span
          className="hud-label"
          style={{ fontSize: 12, letterSpacing: 3, color: '#5c84ff' }}
        >
          {crumbFromPath(pathname)}
        </span>
      </div>

      {hasTour && (
        <button
          type="button"
          data-tour="help-desktop"
          onClick={() => window.dispatchEvent(new CustomEvent('replay-tour'))}
          aria-label="Panduan halaman ini"
          className="ml-auto flex h-9 items-center gap-2 px-3 text-[12px] font-semibold transition hover:brightness-110"
          style={{ color: '#9bb3ff', border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.06)', borderRadius: 8 }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          Panduan
        </button>
      )}
    </header>
  )
}
