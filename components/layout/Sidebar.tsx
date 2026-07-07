'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

type NavItem = { href: string; label: string; color: string; badge?: string }

const baseNav: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', color: '#3b82f6' },
  { href: '/alat', label: 'Alat', color: '#a855f7' },
  { href: '/peminjaman', label: 'Peminjaman', color: '#22c55e' },
]
const siswaTail: NavItem[] = [{ href: '/profil', label: 'Profil', color: '#5c84ff' }]
const adminTail: NavItem[] = [
  { href: '/users', label: 'Users', color: '#eab308' },
  { href: '/laporan', label: 'Laporan', color: '#ef4444' },
  { href: '/inventaris-lab', label: 'Inventaris Lab', color: '#38bdf8', badge: 'BARU' },
]

interface SidebarProps {
  role?: string
  onNavigate?: () => void
}

export function Sidebar({ role, onNavigate }: SidebarProps) {
  const pathname = usePathname()
  const isMobile = onNavigate !== undefined
  const isAdmin = role === 'admin'
  const items = isAdmin ? [...baseNav, ...adminTail] : [...baseNav, ...siswaTail]

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
          {isAdmin ? 'SISTEM' : 'MENU SISWA'}
        </div>
        {items.map((item) => {
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
              {item.badge && (
                <span
                  className="ml-auto rounded-full px-2 py-0.5 text-white"
                  style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: 0.6, background: 'linear-gradient(135deg, #2563eb, #9333ea)' }}
                >
                  {item.badge}
                </span>
              )}
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
