'use client'

import { signOut } from 'next-auth/react'
import { User, ChevronDown, LogOut, Menu } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface TopbarProps {
  userName?: string | null
  userRole?: string
  onMenuToggle?: () => void
}

export function Topbar({ userName, userRole, onMenuToggle }: TopbarProps) {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

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
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-neutral-800 bg-black/80 px-4 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="rounded-lg p-1.5 text-neutral-400 hover:text-white md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="gradient-text font-bold md:hidden">Iventaris_TKJ</span>
      </div>

      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-neutral-300 transition-colors hover:bg-white/[0.05]"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
            <User className="h-4 w-4 text-white" />
          </div>
          <span className="hidden sm:block">{userName ?? 'User'}</span>
          {userRole === 'admin' && (
            <span className="hidden rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-400 sm:block">
              Admin
            </span>
          )}
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
        </button>

        {open && (
          <div className="absolute right-0 mt-1 w-48 rounded-xl border border-neutral-800 bg-neutral-950 py-1 shadow-xl">
            <div className="border-b border-neutral-800 px-3 py-2">
              <p className="text-sm font-medium text-white">{userName}</p>
              <p className="text-xs text-neutral-500 capitalize">{userRole}</p>
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
