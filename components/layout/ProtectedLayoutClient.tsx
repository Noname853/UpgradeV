'use client'

import { useState, useEffect } from 'react'
import { Sidebar, type SidebarStats } from './Sidebar'
import { Topbar } from './Topbar'

interface Props {
  children: React.ReactNode
  userName?: string | null
  userRole?: string
  userKelas?: string | null
}

export function ProtectedLayoutClient({ children, userName, userRole, userKelas }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [stats, setStats] = useState<SidebarStats | null>(null)

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
      style={{ background: 'var(--hud-bg)' }}
    >
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0 print:hidden">
        <Sidebar role={userRole} userName={userName} userKelas={userKelas} stats={stats} />
      </div>

      {/* Mobile sidebar drawer */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <div className="fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col md:hidden">
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
      <div className="flex flex-1 flex-col overflow-hidden print:block print:overflow-visible">
        <div className="print:hidden">
          <Topbar onMenuToggle={() => setMobileOpen(true)} />
        </div>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 print:overflow-visible print:p-0">{children}</main>
      </div>
    </div>
  )
}
