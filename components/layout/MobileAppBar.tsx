'use client'

import { usePathname, useRouter } from 'next/navigation'
import { isBackPage, titleForPath } from './mobile-shell-utils'
import { NotifikasiBell } from './NotifikasiBell'

interface Props {
  isAdmin: boolean
  onMenu: () => void
}

// App bar atas untuk layar HP (56px). Tombol kiri: kembali di sub-halaman,
// menu (drawer) untuk admin di root; siswa di root tanpa tombol kiri. Judul di
// tengah mengikuti rute. Lonceng notifikasi di kanan.
export function MobileAppBar({ isAdmin, onMenu }: Props) {
  const pathname = usePathname()
  const router = useRouter()

  const back = isBackPage(pathname)
  const title = titleForPath(pathname, isAdmin)
  const showLead = back || isAdmin

  const leadClip =
    'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)'

  return (
    <header
      className="relative flex h-14 flex-none items-center gap-3 px-4"
      style={{ borderBottom: '1px solid rgba(99,102,241,0.12)', background: 'rgba(8,9,12,0.82)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
    >
      {showLead && (
        <button
          type="button"
          onClick={() => (back ? router.back() : onMenu())}
          aria-label={back ? 'Kembali' : 'Buka menu'}
          className="hud-press flex h-10 w-10 flex-none items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(99,102,241,0.16)', color: '#c3ccd6', clipPath: leadClip }}
        >
          {back ? (
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          ) : (
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          )}
        </button>
      )}

      {/* judul tengah */}
      <div className="pointer-events-none absolute left-[60px] right-[60px] top-1/2 -translate-y-1/2 text-center">
        <div
          className="truncate"
          style={{ fontFamily: 'var(--font-orbitron), sans-serif', fontWeight: 800, fontSize: 15, letterSpacing: 1, color: '#f0f4f8', textTransform: 'uppercase', lineHeight: 1 }}
        >
          {title}
        </div>
      </div>

      <div className="flex-1" />

      <NotifikasiBell />
    </header>
  )
}
