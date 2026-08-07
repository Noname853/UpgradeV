'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { activeTab } from './mobile-shell-utils'
import { ScanPengembalianDialog } from '@/components/peminjaman/ScanPengembalianButton'

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const icons: Record<string, ReactNode> = {
  dashboard: (
    <svg width="21" height="21" viewBox="0 0 24 24" {...stroke}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  alat: (
    <svg width="21" height="21" viewBox="0 0 24 24" {...stroke}>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="M3.3 7l8.7 5 8.7-5M12 22V12" />
    </svg>
  ),
  peminjaman: (
    <svg width="21" height="21" viewBox="0 0 24 24" {...stroke}>
      <path d="M3 7h13l-2.5-2.5M21 17H8l2.5 2.5" />
    </svg>
  ),
  profil: (
    <svg width="21" height="21" viewBox="0 0 24 24" {...stroke}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.5-6 8-6s8 2 8 6" />
    </svg>
  ),
  settings: (
    <svg width="21" height="21" viewBox="0 0 24 24" {...stroke}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
}

const fabIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" {...stroke}>
    <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M3 12h18" />
  </svg>
)

type Tab = { key: string; label: string; href: string }

const tabsLeft: Tab[] = [
  { key: 'dashboard', label: 'Beranda', href: '/dashboard' },
  { key: 'alat', label: 'Alat', href: '/alat' },
]
const tabsRight: Tab[] = [
  { key: 'peminjaman', label: 'Pinjam', href: '/peminjaman' },
  { key: 'profil', label: 'Profil', href: '/profil' },
]

// Bottom nav 76px dengan FAB tengah. Hanya dirender di layar HP (parent
// menyembunyikannya di desktop). FAB: siswa -> Buat Peminjaman, admin -> Scan.
export function MobileBottomNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const [scanOpen, setScanOpen] = useState(false)
  const current = activeTab(pathname)

  function TabButton({ tab }: { tab: Tab }) {
    const active = current === tab.key
    // Untuk admin, tab "Profil" tampil sebagai Pengaturan (ikon gear).
    const isProfilAdmin = tab.key === 'profil' && isAdmin
    const icon = isProfilAdmin ? icons.settings : icons[tab.key]
    const label = isProfilAdmin ? 'Pengaturan' : tab.label
    return (
      <Link
        href={tab.href}
        data-tour={`nav-${tab.key}`}
        className="flex flex-1 flex-col items-center gap-1 py-2"
        style={{ color: active ? '#5c84ff' : '#5d6773' }}
        aria-current={active ? 'page' : undefined}
      >
        {icon}
        <span style={{ fontFamily: 'var(--font-rajdhani), sans-serif', fontSize: 9.5, fontWeight: 600, letterSpacing: 0.3 }}>
          {label}
        </span>
      </Link>
    )
  }

  return (
    <>
      <nav
        className="relative z-30 flex flex-none items-center"
        style={{
          height: 76,
          paddingBottom: 'calc(14px + env(safe-area-inset-bottom))',
          background: '#0b0c12',
          borderTop: '1px solid rgba(99,102,241,0.14)',
        }}
      >
        {tabsLeft.map((t) => (
          <TabButton key={t.key} tab={t} />
        ))}

        {/* FAB tengah */}
        <div className="relative flex flex-none justify-center" style={{ width: 76 }}>
          {/* dudukan gelap solid: menutupi konten di belakang tonjolan FAB
              supaya FAB tampil bulat penuh & tidak "terpotong" saat scroll */}
          <span
            aria-hidden
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: 78,
              height: 78,
              borderRadius: '50%',
              background: '#0b0c12',
              transform: 'translate(-50%, -50%)',
              marginTop: -16,
            }}
          />
          <button
            type="button"
            data-tour="fab"
            aria-label={isAdmin ? 'Scan pengembalian' : 'Buat peminjaman'}
            onClick={() => (isAdmin ? setScanOpen(true) : router.push('/peminjaman/baru?scan=1'))}
            className="hud-press relative flex items-center justify-center"
            style={{
              top: -16,
              width: 58,
              height: 58,
              borderRadius: '50%',
              color: '#fff',
              background: 'linear-gradient(135deg, #2563eb, #9333ea)',
              boxShadow: '0 8px 24px -4px rgba(92,132,255,0.6), 0 0 0 5px #0b0c12',
            }}
          >
            {fabIcon}
          </button>
        </div>

        {tabsRight.map((t) => (
          <TabButton key={t.key} tab={t} />
        ))}
      </nav>

      {isAdmin && <ScanPengembalianDialog open={scanOpen} onClose={() => setScanOpen(false)} />}
    </>
  )
}
