'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar, type SidebarStats } from './Sidebar'
import { Topbar } from './Topbar'
import { MobileAppBar } from './MobileAppBar'
import { MobileBottomNav } from './MobileBottomNav'
import { PageTour } from '@/components/shared/PageTour'

interface Props {
  children: React.ReactNode
  userName?: string | null
  userRole?: string
  userKelas?: string | null
}

export function ProtectedLayoutClient({ children, userName, userRole, userKelas }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [stats, setStats] = useState<SidebarStats | null>(null)
  const pathname = usePathname()
  const isAdmin = userRole === 'admin'

  // close drawer on resize to desktop
  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 768) setMobileOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // ringkasan peminjaman untuk kartu statistik sidebar
  useEffect(() => {
    let aktif = true
    fetch('/api/dashboard/stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!aktif || !data) return
        setStats({
          peminjamanAktif: data.peminjamanAktif ?? 0,
          menungguVerifikasi: data.menungguVerifikasi ?? 0,
        })
      })
      .catch(() => {})
    return () => {
      aktif = false
    }
  }, [])

  return (
    <div
      className="hud-root flex h-screen overflow-hidden print:block print:h-auto print:overflow-visible"
      style={{ background: 'var(--hud-bg)', height: '100dvh' }}
    >
      <PageTour role={userRole} />
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0 print:hidden">
        <Sidebar role={userRole} userName={userName} userKelas={userKelas} stats={stats} />
      </div>

      {/* Drawer (mobile) — untuk admin lewat tombol menu app bar */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            style={{ animation: 'hudFadeIn 0.2s ease' }}
            onClick={() => setMobileOpen(false)}
          />
          <div
            className="fixed inset-y-0 left-0 z-50 flex w-[290px] flex-col md:hidden"
            style={{ animation: 'hudDrawerIn 0.26s cubic-bezier(0.2,0.8,0.2,1) both' }}
          >
            <Sidebar
              role={userRole}
              userName={userName}
              userKelas={userKelas}
              stats={stats}
              onNavigate={() => setMobileOpen(false)}
              onClose={() => setMobileOpen(false)}
            />
          </div>
        </>
      )}

      {/* Main content */}
      <div className="relative flex flex-1 flex-col overflow-hidden print:block print:overflow-visible">
        {/* Topbar (desktop) */}
        <div className="hidden md:block print:hidden">
          <Topbar onMenuToggle={() => setMobileOpen(true)} role={userRole} />
        </div>

        {/* App bar (mobile) */}
        <div className="md:hidden print:hidden">
          <MobileAppBar isAdmin={isAdmin} onMenu={() => setMobileOpen(true)} />
        </div>

        <main className="flex-1 overflow-y-auto p-4 pb-28 md:p-6 print:overflow-visible print:p-0">
          <div key={pathname} className="hud-screen-in">
            {children}
          </div>
        </main>

        {/* Bottom nav + FAB (mobile) — FIXED di dasar layar, di luar area scroll,
            jadi tak ikut ter-scroll & tak terpotong. Konten diberi padding bawah
            supaya bisa di-scroll penuh di atasnya. */}
        <div className="fixed inset-x-0 bottom-0 z-30 md:hidden print:hidden">
          <MobileBottomNav isAdmin={isAdmin} />
        </div>
      </div>
    </div>
  )
}
