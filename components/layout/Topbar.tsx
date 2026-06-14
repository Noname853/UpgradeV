'use client'

import { signOut } from 'next-auth/react'
import { ChevronDown, LogOut, Menu } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface TopbarProps {
  userName?: string | null
  userRole?: string
  userKelas?: string | null
  onMenuToggle?: () => void
}

function crumbFromPath(pathname: string): string {
  const seg = pathname.split('/').filter(Boolean)[0] ?? 'dashboard'
  return seg.replace(/-/g, ' ').toUpperCase()
}

export function Topbar({ userName, userRole, userKelas, onMenuToggle }: TopbarProps) {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const isAdmin = userRole === 'admin'
  const initial = (userName ?? 'U').charAt(0).toUpperCase()
  const tagline = isAdmin ? 'ADMIN' : (userKelas ? `SISWA · ${userKelas}` : 'SISWA')

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <header
      className="sticky top-0 z-40 flex h-16 items-center justify-between px-4 md:px-[26px]"
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

      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setOpen(!open)}
          className="hud-clip-md flex items-center gap-[10px] py-[6px] pl-3 pr-2 transition-colors"
          style={{ border: '1px solid rgba(99,102,241,0.2)' }}
        >
          <div className="text-right" style={{ lineHeight: 1.1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#e8edf2' }}>
              {userName ?? 'User'}
            </div>
            <div
              style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: '#5c84ff' }}
            >
              {tagline}
            </div>
          </div>
          <div
            className="hud-hex flex h-8 w-8 items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #2563eb, #9333ea)',
              fontFamily: 'var(--font-orbitron), sans-serif',
              fontSize: 13,
              fontWeight: 800,
              color: '#fff',
            }}
          >
            {initial}
          </div>
          <ChevronDown
            className={cn('h-3.5 w-3.5 text-neutral-400 transition-transform', open && 'rotate-180')}
          />
        </button>

        {open && (
          <div
            className="hud-clip-md absolute right-0 z-50 mt-2 w-52 py-1"
            style={{
              background: '#0c0e13',
              border: '1px solid rgba(99,102,241,0.2)',
            }}
          >
            <div className="px-3 py-2" style={{ borderBottom: '1px solid rgba(99,102,241,0.14)' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#e8edf2' }}>{userName}</p>
              <p className="capitalize" style={{ fontSize: 11, color: '#6b7785' }}>
                {userRole}
                {userKelas && !isAdmin ? ` · ${userKelas}` : ''}
              </p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-neutral-400 transition-colors hover:text-red-400"
            >
              <LogOut className="h-4 w-4" />
              Keluar
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
