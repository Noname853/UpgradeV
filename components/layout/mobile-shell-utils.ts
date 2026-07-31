// Util bersama untuk shell mobile (app bar + bottom nav). Memetakan rute ke
// judul app bar dan menentukan apakah sebuah halaman adalah "sub-halaman"
// (tampilkan tombol kembali) atau "root" (tampilkan menu untuk admin).

// Root yang punya tab / entri drawer sendiri — di sini app bar menampilkan
// menu (admin) atau tanpa tombol kiri (siswa), bukan tombol kembali.
export const MOBILE_ROOTS = [
  '/dashboard',
  '/alat',
  '/peminjaman',
  '/profil',
  '/users',
  '/laporan',
  '/inventaris-lab',
]

// Tab bottom-nav (root section-nya). Dipakai untuk menandai tab aktif.
export const TAB_ROOTS = {
  dashboard: '/dashboard',
  alat: '/alat',
  peminjaman: '/peminjaman',
  profil: '/profil',
} as const

function normalize(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1)
  return pathname
}

// Halaman kembali = bukan salah satu root persis.
export function isBackPage(pathname: string): boolean {
  return !MOBILE_ROOTS.includes(normalize(pathname))
}

// Judul app bar per-rute (Bahasa Indonesia).
export function titleForPath(pathname: string, isAdmin: boolean): string {
  const p = normalize(pathname)

  if (p === '/dashboard') return 'Dashboard'

  if (p.startsWith('/alat')) {
    if (p === '/alat') return 'Katalog Alat'
    if (p === '/alat/baru') return 'Tambah Alat'
    if (p === '/alat/import') return 'Impor Alat'
    if (p === '/alat/labels') return 'Label QR'
    if (p.endsWith('/edit')) return 'Edit Alat'
    return 'Detail Alat'
  }

  if (p.startsWith('/peminjaman')) {
    if (p === '/peminjaman') return isAdmin ? 'Peminjaman' : 'Peminjaman Saya'
    if (p === '/peminjaman/baru') return 'Buat Peminjaman'
    if (p === '/peminjaman/arsip') return 'Arsip Peminjaman'
    return 'Detail Peminjaman'
  }

  if (p.startsWith('/profil')) return isAdmin ? 'Pengaturan' : 'Profil'

  if (p.startsWith('/users')) {
    if (p === '/users') return 'Kelola Users'
    if (p === '/users/baru') return 'Tambah User'
    if (p.endsWith('/edit')) return 'Edit User'
    if (p.endsWith('/detail')) return 'Detail User'
    return 'User'
  }

  if (p.startsWith('/laporan')) return 'Laporan'
  if (p.startsWith('/inventaris-lab')) return 'Inventaris Lab'

  // fallback: segmen pertama, kapital
  const seg = p.split('/').filter(Boolean)[0] ?? 'dashboard'
  return seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// Tab aktif untuk bottom-nav berdasarkan pathname.
export function activeTab(pathname: string): keyof typeof TAB_ROOTS | null {
  const p = normalize(pathname)
  if (p === '/dashboard') return 'dashboard'
  if (p.startsWith('/alat')) return 'alat'
  if (p.startsWith('/peminjaman')) return 'peminjaman'
  if (p.startsWith('/profil')) return 'profil'
  return null
}
