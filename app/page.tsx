import Link from 'next/link'
import { Wrench, PackageCheck, FileBarChart2, Shield, Zap, Users } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-neutral-800 bg-black/80 px-6 backdrop-blur-md">
        <span className="gradient-text text-lg font-bold tracking-tight">Iventaris_TKJ</span>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-lg px-4 py-1.5 text-sm text-neutral-300 transition hover:text-white"
          >
            Masuk
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-white px-4 py-1.5 text-sm font-medium text-black transition hover:bg-neutral-200"
          >
            Daftar
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center overflow-hidden px-6 py-28 text-center md:py-40">
        {/* Background glow */}
        <div className="absolute left-1/2 top-1/2 -z-10 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute left-1/4 top-1/3 -z-10 h-[400px] w-[400px] rounded-full bg-purple-600/8 blur-[100px]" />

        <div className="mb-5 inline-flex items-center rounded-full border border-neutral-800 bg-white/[0.03] px-4 py-1.5 text-sm text-neutral-400">
          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-green-400" />
          Sistem Inventaris Modern TKJ
        </div>

        <h1 className="max-w-3xl text-5xl font-extrabold leading-tight tracking-tight md:text-7xl">
          Kelola Inventaris{' '}
          <span className="gradient-text">TKJ</span>{' '}
        </h1>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/login"
            className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-3 text-base font-semibold text-white shadow-lg transition hover:from-blue-500 hover:to-purple-500 hover:shadow-blue-500/25"
          >
            Masuk ke Dasbor →
          </Link>
          <Link
            href="/register"
            className="rounded-xl border border-neutral-700 px-8 py-3 text-base text-neutral-300 transition hover:border-neutral-600 hover:text-white"
          >
            Buat Akun Gratis
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-neutral-800 py-10">
        <div className="mx-auto grid max-w-5xl grid-cols-3 divide-x divide-neutral-800 px-6">
          {[
            { value: '2 Role', label: 'Admin & Siswa' },
            { value: 'Real-time', label: 'Stok Tersedia' },
            { value: '100%', label: 'Open Source' },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center py-4">
              <p className="gradient-text text-2xl font-bold md:text-3xl">{s.value}</p>
              <p className="mt-1 text-sm text-neutral-500">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-white md:text-4xl">
            Semua yang kamu butuhkan
          </h2>
          <p className="mt-3 text-neutral-400">Fitur lengkap untuk pengelolaan inventaris TKJ</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: Wrench,
              title: 'Manajemen Alat',
              desc: 'Tambah, edit, dan pantau stok peralatan laboratorium. Dilengkapi tracking EOS/EOL untuk setiap alat.',
              color: 'text-blue-400',
              bg: 'bg-blue-500/10',
            },
            {
              icon: PackageCheck,
              title: 'Sistem Peminjaman',
              desc: 'Siswa mengajukan peminjaman, admin memverifikasi. Notifikasi status real-time dan riwayat lengkap.',
              color: 'text-purple-400',
              bg: 'bg-purple-500/10',
            },
            {
              icon: FileBarChart2,
              title: 'Laporan & Statistik',
              desc: 'Dashboard dengan chart aktivitas, statistik stok rendah, dan laporan peminjaman yang bisa difilter.',
              color: 'text-green-400',
              bg: 'bg-green-500/10',
            },
            {
              icon: Shield,
              title: 'Role-based Access',
              desc: 'Hak akses terpisah untuk admin dan siswa. Admin kelola semua, siswa hanya lihat & ajukan peminjaman.',
              color: 'text-yellow-400',
              bg: 'bg-yellow-500/10',
            },
            {
              icon: Zap,
              title: 'Cepat & Responsif',
              desc: 'Dibangun dengan Next.js 16 dan React Server Components untuk performa optimal di semua perangkat.',
              color: 'text-orange-400',
              bg: 'bg-orange-500/10',
            },
            {
              icon: Users,
              title: 'Manajemen User',
              desc: 'Kelola akun siswa. Reset password, kelompok, dan kelas.',
              color: 'text-pink-400',
              bg: 'bg-pink-500/10',
            },
          ].map((f) => {
            const Icon = f.icon
            return (
              <div key={f.title} className="glass-card p-5 transition hover:border-neutral-700">
                <div className={`mb-4 inline-flex rounded-xl p-3 ${f.bg}`}>
                  <Icon className={`h-5 w-5 ${f.color}`} />
                </div>
                <h3 className="mb-2 font-semibold text-white">{f.title}</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">{f.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-800 py-6 text-center text-sm text-neutral-600">
        <p>Iventaris TKJ — Sistem Inventaris Sekolah Kejuruan</p>
      </footer>
    </div>
  )
}
