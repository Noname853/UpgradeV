'use client'

import { Menu } from 'lucide-react'
import { usePathname } from 'next/navigation'

interface TopbarProps {
  onMenuToggle?: () => void
}

function crumbFromPath(pathname: string): string {
  const seg = pathname.split('/').filter(Boolean)[0] ?? 'dashboard'
  return seg.replace(/-/g, ' ').toUpperCase()
}

export function Topbar({ onMenuToggle }: TopbarProps) {
  const pathname = usePathname()

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
    </header>
  )
}
