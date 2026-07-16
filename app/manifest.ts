import type { MetadataRoute } from 'next'

// Web App Manifest (konvensi Next: app/manifest.ts → /manifest.webmanifest).
// Membuat aplikasi bisa di-install ke home screen (PWA) di Android & iOS.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Inventaris TKJ',
    short_name: 'Inventaris TKJ',
    description:
      'Sistem manajemen peminjaman alat laboratorium TKJ — scan QR, pinjam, dan kembalikan alat.',
    lang: 'id',
    // Mulai dari dashboard; proxy.ts akan mengalihkan ke /login bila belum masuk.
    start_url: '/dashboard',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#000000',
    theme_color: '#000000',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      // Ikon maskable: gambar full-bleed dengan safe zone di tengah,
      // dipakai Android untuk bentuk adaptif (lingkaran/squircle).
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
