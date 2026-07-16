import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Orbitron, Rajdhani } from 'next/font/google'
import { PwaRegister } from '@/components/shared/PwaRegister'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

// HUD/Transformers theme fonts (admin panel)
const orbitron = Orbitron({
  variable: '--font-orbitron',
  subsets: ['latin'],
  weight: ['600', '700', '800', '900'],
})

const rajdhani = Rajdhani({
  variable: '--font-rajdhani',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

// CSP berbasis nonce (lihat proxy.ts) menyuntik nonce per-request, jadi semua
// halaman harus dirender dinamis agar script Next selalu membawa nonce yang cocok.
// Halaman terproteksi sudah dinamis karena memakai auth(); ini mencakup sisanya
// (landing, login, register) agar tidak ter-prerender statis tanpa nonce.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Iventaris TKJ — Sistem Inventaris Sekolah',
  description: 'Sistem manajemen inventaris modern untuk laboratorium sekolah kejuruan',
  icons: {
    icon: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  // Dukungan "Add to Home Screen" iOS (Safari tidak sepenuhnya memakai manifest).
  appleWebApp: {
    capable: true,
    title: 'Inventaris TKJ',
    statusBarStyle: 'black-translucent',
  },
}

export const viewport: Viewport = {
  themeColor: '#000000',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable} ${orbitron.variable} ${rajdhani.variable}`}>
      <body className="min-h-screen bg-black text-white antialiased">
        <PwaRegister />
        {children}
      </body>
    </html>
  )
}
