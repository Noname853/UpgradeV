'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type SidebarStats = {
  peminjamanAktif: number
  menungguVerifikasi: number
}

type NavItem = {
  href: string
  label: string
  hint: string
  color: string
  icon: ReactNode
  badge?: string
}

/* --- ikon inline (mandiri, tanpa dependensi) --- */
const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}
const IconDashboard = (
  <svg viewBox="0 0 24 24" width={17} height={17} {...stroke}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
)
const IconAlat = (
  <svg viewBox="0 0 24 24" width={17} height={17} {...stroke}>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <path d="M3.3 7l8.7 5 8.7-5M12 22V12" />
  </svg>
)
const IconPeminjaman = (
  <svg viewBox="0 0 24 24" width={17} height={17} {...stroke}>
    <path d="M3 7h13l-2.5-2.5M21 17H8l2.5 2.5" />
  </svg>
)
const IconProfil = (
  <svg viewBox="0 0 24 24" width={17} height={17} {...stroke}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.5-6 8-6s8 2 8 6" />
  </svg>
)
const IconUsers = (
  <svg viewBox="0 0 24 24" width={17} height={17} {...stroke}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" />
    <path d="M16 5.2A3.2 3.2 0 0 1 16 11.6M21 20c0-3-1.8-4.6-4.5-4.9" />
  </svg>
)
const IconLaporan = (
  <svg viewBox="0 0 24 24" width={17} height={17} {...stroke}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5M9 13h6M9 17h6" />
  </svg>
)
const IconLab = (
  <svg viewBox="0 0 24 24" width={17} height={17} {...stroke}>
    <path d="M9 3v6l-5 8.5A2 2 0 0 0 5.7 21h12.6a2 2 0 0 0 1.7-3.5L15 9V3" />
    <path d="M8 3h8M8 14h8" />
  </svg>
)
const IconChevron = (
  <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 6l6 6-6 6" />
  </svg>
)

const baseNav: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', hint: 'Ringkasan & aktivitas', color: '#3b82f6', icon: IconDashboard },
  { href: '/alat', label: 'Alat', hint: 'Katalog unit lab', color: '#a855f7', icon: IconAlat },
  { href: '/peminjaman', label: 'Peminjaman', hint: 'Pinjam & kembalikan', color: '#22c55e', icon: IconPeminjaman },
]
const siswaTail: NavItem[] = [
  { href: '/profil', label: 'Profil', hint: 'Akun & kelompok', color: '#5c84ff', icon: IconProfil },
]
const adminTail: NavItem[] = [
  { href: '/users', label: 'Users', hint: 'Kelola akun siswa', color: '#eab308', icon: IconUsers },
  { href: '/laporan', label: 'Laporan', hint: 'Ekspor & rekap', color: '#ef4444', icon: IconLaporan },
  { href: '/inventaris-lab', label: 'Inventaris Lab', hint: 'Sensus inventaris', color: '#38bdf8', icon: IconLab, badge: 'BARU' },
]

type StatCard = { label: string; value?: number; color: string }

interface SidebarProps {
  role?: string
  userName?: string | null
  userKelas?: string | null
  stats?: SidebarStats | null
  onNavigate?: () => void
  onClose?: () => void
}

export function Sidebar({ role, userName, userKelas, stats, onNavigate, onClose }: SidebarProps) {
  const pathname = usePathname()
  const isMobile = onNavigate !== undefined
  const isAdmin = role === 'admin'
  const items = isAdmin ? [...baseNav, ...adminTail] : [...baseNav, ...siswaTail]
  const initial = (userName ?? 'U').charAt(0).toUpperCase()
  const roleLabel = isAdmin ? 'ADMIN' : 'SISWA'

  const statCards: StatCard[] = isAdmin
    ? [
        { label: 'Perlu Verifikasi', value: stats?.menungguVerifikasi, color: '#eab308' },
        { label: 'Sedang Dipinjam', value: stats?.peminjamanAktif, color: '#22c55e' },
      ]
    : [
        { label: 'Sedang Dipinjam', value: stats?.peminjamanAktif, color: '#22c55e' },
        { label: 'Menunggu Verifikasi', value: stats?.menungguVerifikasi, color: '#eab308' },
      ]

  return (
    <aside
      className={cn(
        'hud-root relative z-30 flex h-full flex-col',
        isMobile ? 'w-full' : 'w-[248px]'
      )}
      style={{
        background: 'linear-gradient(180deg, #0b0c12, #070809)',
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
        {isMobile && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup menu"
            className="ml-auto flex h-8 w-8 items-center justify-center text-neutral-400 transition-colors hover:text-white"
            style={{
              border: '1px solid rgba(99,102,241,0.16)',
              background: 'rgba(255,255,255,0.02)',
              clipPath:
                'polygon(7px 0, 100% 0, 100% calc(100% - 7px), calc(100% - 7px) 100%, 0 100%, 0 7px)',
            }}
          >
            <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        )}
      </div>

      {/* scrollable body */}
      <div className="flex flex-1 flex-col overflow-y-auto px-[10px] py-[12px]">
        {/* identity card */}
        <div
          className="relative flex items-center gap-3 px-[12px] py-[11px]"
          style={{
            background: 'linear-gradient(160deg, rgba(255,255,255,0.05), rgba(255,255,255,0.014))',
            border: '1px solid rgba(99,102,241,0.16)',
            clipPath:
              'polygon(11px 0, 100% 0, 100% calc(100% - 11px), calc(100% - 11px) 100%, 0 100%, 0 11px)',
          }}
        >
          <span
            className="absolute bottom-0 left-0 top-0"
            style={{ width: 2, background: 'linear-gradient(180deg, #5c84ff, #a855f7)' }}
          />
          <div
            className="hud-hex flex items-center justify-center"
            style={{
              width: 38,
              height: 42,
              background: 'linear-gradient(135deg, #2563eb, #9333ea)',
              fontFamily: 'var(--font-orbitron), sans-serif',
              fontSize: 16,
              fontWeight: 800,
              color: '#fff',
              boxShadow: '0 0 14px -3px rgba(92,132,255,0.6)',
            }}
          >
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="truncate"
              style={{ fontSize: 14.5, fontWeight: 700, color: '#e8edf2' }}
            >
              {userName ?? 'Pengguna'}
            </div>
            <div className="hud-label mt-[3px] truncate" style={{ fontSize: 8.5, letterSpacing: 1.4 }}>
              <span style={{ color: '#5c84ff' }}>{roleLabel}</span>
              {userKelas && !isAdmin && <span style={{ color: '#6b7785' }}> · {userKelas}</span>}
            </div>
          </div>
          <span
            className="hud-diamond hud-blink"
            style={{ width: 7, height: 7, background: '#2bff88', boxShadow: '0 0 8px rgba(43,255,136,0.8)' }}
          />
        </div>

        {/* quick stats */}
        <div className="mt-[10px] grid grid-cols-2 gap-[8px]">
          {statCards.map((s) => (
            <div
              key={s.label}
              className="px-[11px] py-[10px]"
              style={{
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(99,102,241,0.16)',
                clipPath:
                  'polygon(9px 0, 100% 0, 100% calc(100% - 9px), calc(100% - 9px) 100%, 0 100%, 0 9px)',
              }}
            >
              <div
                className="hud-title"
                style={{ fontSize: 21, lineHeight: 1, color: s.color, fontVariantNumeric: 'tabular-nums' }}
              >
                {s.value ?? '–'}
              </div>
              <div className="hud-label mt-[6px]" style={{ fontSize: 8, letterSpacing: 1, color: '#6b7785' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* section */}
        <div
          className="hud-label px-[6px] pb-2 pt-[16px]"
          style={{ fontSize: 8.5, letterSpacing: 2.6, color: '#4b5563' }}
        >
          {isAdmin ? 'SISTEM' : 'MENU SISWA'}
        </div>

        {/* nav */}
        <nav className="flex flex-col gap-[4px]">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className="group flex items-center gap-[11px] px-[11px] py-[9px] transition-colors"
                style={{
                  cursor: 'pointer',
                  color: active ? '#f4f7fb' : '#c3ccd6',
                  background: active
                    ? `linear-gradient(90deg, ${item.color}22, transparent 78%)`
                    : 'transparent',
                  borderLeft: `2px solid ${active ? item.color : 'transparent'}`,
                  clipPath:
                    'polygon(9px 0, 100% 0, 100% calc(100% - 9px), calc(100% - 9px) 100%, 0 100%, 0 9px)',
                }}
              >
                <span
                  className="flex items-center justify-center"
                  style={{
                    width: 32,
                    height: 32,
                    color: active ? '#fff' : item.color,
                    background: active ? `${item.color}33` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${active ? `${item.color}8c` : 'rgba(99,102,241,0.16)'}`,
                    boxShadow: active ? `0 0 12px -2px ${item.color}` : 'none',
                    clipPath:
                      'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
                  }}
                >
                  {item.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block" style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: 0.3, lineHeight: 1.1 }}>
                    {item.label}
                  </span>
                  <span className="block" style={{ fontSize: 9, color: '#6b7785', marginTop: 2 }}>
                    {item.hint}
                  </span>
                </span>
                {item.badge && (
                  <span
                    className="rounded-full px-2 py-0.5 text-white"
                    style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: 0.6, background: 'linear-gradient(135deg, #2563eb, #9333ea)' }}
                  >
                    {item.badge}
                  </span>
                )}
                <span
                  className="transition-opacity"
                  style={{ color: active ? item.color : '#4b5563', opacity: active ? 1 : 0 }}
                >
                  {IconChevron}
                </span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* status footer */}
      <div
        className="flex items-center gap-[9px] px-[14px] py-[12px]"
        style={{ borderTop: '1px solid rgba(99,102,241,0.14)' }}
      >
        <span
          className="hud-diamond hud-blink inline-block"
          style={{ width: 7, height: 7, background: '#2bff88', boxShadow: '0 0 9px rgba(43,255,136,0.8)' }}
        />
        <span className="hud-label" style={{ fontSize: 9, letterSpacing: 1.6, color: '#5d717d' }}>
          SISTEM ONLINE
        </span>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: isAdmin ? '/login' : '/' })}
          className="ml-auto flex items-center gap-[6px] px-[12px] py-[7px] transition-colors hover:text-red-400"
          style={{
            fontFamily: 'var(--font-orbitron), sans-serif',
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            color: '#f7a8a8',
            border: '1px solid rgba(239,68,68,0.32)',
            background: 'rgba(239,68,68,0.05)',
            clipPath:
              'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
          }}
        >
          <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          Keluar
        </button>
      </div>
    </aside>
  )
}
