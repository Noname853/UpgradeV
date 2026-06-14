'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Wrench,
  PackageCheck,
  Users,
  FileBarChart2,
  ChevronLeft,
  ChevronRight,
  UserCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, color: '#3b82f6' },
  { href: '/alat', label: 'Alat', icon: Wrench, color: '#a855f7' },
  { href: '/peminjaman', label: 'Peminjaman', icon: PackageCheck, color: '#22c55e' },
  { href: '/profil', label: 'Profil', icon: UserCircle, color: '#5c84ff' },
]

const adminItems = [
  { href: '/users', label: 'Users', icon: Users, color: '#eab308' },
  { href: '/laporan', label: 'Laporan', icon: FileBarChart2, color: '#ef4444' },
]

interface SidebarProps {
  role?: string
  onNavigate?: () => void
}

export function Sidebar({ role, onNavigate }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const isMobile = onNavigate !== undefined
  const isAdmin = role === 'admin'

  const allItems = isAdmin
    ? [...navItems.filter((i) => i.href !== '/profil'), ...adminItems]
    : navItems

  // ── ADMIN: HUD / Transformers sidebar ──────────────────────────────────
  if (isAdmin) {
    return (
      <aside
        className={cn(
          'hud-root relative z-30 flex h-full flex-col',
          isMobile ? 'w-full' : 'w-[232px]'
        )}
        style={{
          background: 'linear-gradient(180deg, #0a0b0f, #07080b)',
          borderRight: isMobile ? undefined : '1px solid rgba(99,102,241,0.18)',
        }}
      >
        {/* vertical energon seam */}
        {!isMobile && (
          <div
            className="absolute bottom-0 top-0"
            style={{
              right: -1,
              width: 2,
              background:
                'linear-gradient(180deg, transparent, rgba(92,132,255,0.5) 20%, rgba(168,85,247,0.5) 80%, transparent)',
            }}
          />
        )}

        {/* brand */}
        <div
          className="flex h-16 items-center gap-3 px-[18px]"
          style={{ borderBottom: '1px solid rgba(99,102,241,0.14)' }}
        >
          <div className="relative h-[34px] w-[34px] shrink-0">
            <div
              className="hud-hex absolute inset-0"
              style={{
                background: 'linear-gradient(150deg, #1b2740, #0a1020)',
                border: '1px solid rgba(92,132,255,0.45)',
              }}
            />
            <div
              className="absolute left-1/2 top-1/2"
              style={{
                width: 15,
                height: 17,
                transform: 'translate(-50%, -52%)',
                background: 'linear-gradient(135deg, #5c84ff, #a855f7)',
                clipPath:
                  'polygon(50% 0, 100% 30%, 78% 30%, 86% 62%, 50% 100%, 14% 62%, 22% 30%, 0 30%)',
              }}
            />
          </div>
          <div style={{ lineHeight: 1.05 }}>
            <div className="hud-title" style={{ fontSize: 14, letterSpacing: 1 }}>
              IVENTARIS
            </div>
            <div
              className="hud-label"
              style={{ fontSize: 9, letterSpacing: 4, color: '#5c84ff' }}
            >
              TKJ · UNIT
            </div>
          </div>
        </div>

        {/* nav */}
        <nav className="flex flex-1 flex-col gap-[3px] overflow-y-auto px-[10px] py-[14px]">
          <div
            className="hud-label px-[10px] pb-2 pt-[6px]"
            style={{ fontSize: 9, letterSpacing: 3, color: '#4b5563' }}
          >
            SISTEM
          </div>
          {allItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className="flex items-center gap-[10px] px-[13px] py-[10px] transition-colors"
                style={{
                  cursor: 'pointer',
                  color: active ? '#f0f4f8' : '#c3ccd6',
                  background: active ? 'rgba(92,132,255,0.1)' : 'transparent',
                  borderLeft: active
                    ? '2px solid #5c84ff'
                    : '2px solid transparent',
                }}
              >
                <span
                  className="hud-diamond inline-block"
                  style={{
                    width: 7,
                    height: 7,
                    background: item.color,
                    boxShadow: active ? `0 0 8px ${item.color}` : 'none',
                  }}
                />
                <span style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: 0.4 }}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>

        {/* status footer */}
        <div
          className="flex items-center gap-[9px] px-[18px] py-[14px]"
          style={{ borderTop: '1px solid rgba(99,102,241,0.14)' }}
        >
          <span
            className="hud-diamond hud-blink inline-block"
            style={{ width: 7, height: 7, background: '#2bff88', boxShadow: '0 0 9px rgba(43,255,136,0.8)' }}
          />
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2, color: '#5d717d' }}>
            SISTEM ONLINE
          </span>
        </div>
      </aside>
    )
  }

  // ── SISWA: original sidebar (unchanged) ────────────────────────────────
  return (
    <aside
      className={cn(
        'relative z-30 flex h-full flex-col bg-neutral-950 transition-all duration-200',
        !isMobile && 'border-r border-neutral-800',
        isMobile ? 'w-full' : collapsed ? 'w-16' : 'w-56'
      )}
    >
      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4">
        {allItems.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                active
                  ? 'bg-white/[0.05] text-white border-l-2 border-blue-500'
                  : 'text-neutral-400 hover:bg-white/[0.03] hover:text-white border-l-2 border-transparent'
              )}
              title={collapsed && !isMobile ? item.label : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {(!collapsed || isMobile) && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Collapse toggle — desktop only */}
      {!isMobile && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-16 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900 text-neutral-400 hover:text-white"
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      )}
    </aside>
  )
}
