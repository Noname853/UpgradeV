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
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/alat', label: 'Alat', icon: Wrench },
  { href: '/peminjaman', label: 'Peminjaman', icon: PackageCheck },
  { href: '/profil', label: 'Profil', icon: UserCircle },
]

const adminItems = [
  { href: '/users', label: 'Users', icon: Users },
  { href: '/laporan', label: 'Laporan', icon: FileBarChart2 },
]

interface SidebarProps {
  role?: string
  onNavigate?: () => void
}

export function Sidebar({ role, onNavigate }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const isMobile = onNavigate !== undefined

  const allItems = role === 'admin'
    ? [...navItems.filter(i => i.href !== '/profil'), ...adminItems]
    : navItems

  return (
    <aside
      className={cn(
        'relative flex h-full flex-col bg-neutral-950 transition-all duration-200',
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
          className="absolute -right-3 top-16 flex h-6 w-6 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900 text-neutral-400 hover:text-white"
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      )}
    </aside>
  )
}
