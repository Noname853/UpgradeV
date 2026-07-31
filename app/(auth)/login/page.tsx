import { signIn } from '@/lib/auth'
import { AuthError } from 'next-auth'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { checkRateLimit, clientIp } from '@/lib/rate-limit'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { IsiDemoButtons } from './IsiDemoButtons'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; registered?: string }>
}) {
  const sp = await searchParams

  async function loginAction(formData: FormData) {
    'use server'
    const ip = clientIp(await headers())
    if (!(await checkRateLimit(`login:${ip}`, 10, 5 * 60_000))) {
      redirect('/login?error=ratelimit')
    }

    const email = (formData.get('email') as string)?.trim().toLowerCase()
    const password = formData.get('password') as string

    // Cek status akun dulu agar bisa beri pesan spesifik bila nonaktif.
    // Kredensial tetap divalidasi penuh oleh signIn di bawah.
    if (email) {
      const user = await prisma.user.findUnique({
        where: { email },
        select: { isActive: true },
      })
      if (user && !user.isActive) {
        redirect('/login?error=inactive')
      }
    }

    try {
      await signIn('credentials', {
        email,
        password,
        redirectTo: '/dashboard',
      })
    } catch (error) {
      if (error instanceof AuthError) {
        redirect('/login?error=invalid')
      }
      throw error
    }
  }

  return (
    <div className="tf-card glass-card w-full max-w-sm p-8">
      {/* Tema Transformers: dekorasi HUD (warna & teks tidak berubah) */}
      <style>{TF_STYLE}</style>
      <span className="tf-scan" aria-hidden />
      <span className="tf-br tf-br-tl" aria-hidden />
      <span className="tf-br tf-br-br" aria-hidden />

      <div className="relative" style={{ zIndex: 2 }}>
        {/* Logo heksagon */}
        <div className="mb-5 flex flex-col items-center">
          <div
            className="mb-2 flex h-14 w-14 items-center justify-center"
            style={{ clipPath: 'polygon(50% 0,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%)', background: 'linear-gradient(135deg,#2563eb,#9333ea)', boxShadow: '0 0 20px -4px rgba(92,132,255,0.7)' }}
          >
            <svg width="22" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l7 4v6c0 4-3 7-7 8-4-1-7-4-7-8V7z" />
              <path d="M12 8v6M9 11l3-3 3 3" />
            </svg>
          </div>
          <div className="tf-head text-lg font-bold text-white">SISTEM</div>
          <div className="text-[9px] font-semibold tracking-[4px] text-blue-400">ONLY · UNIT</div>
        </div>

        <h1 className="tf-head mb-1 text-2xl font-bold text-white">Masuk</h1>
        <p className="mb-6 text-sm text-neutral-400">Silakan login untuk melanjutkan</p>

        {sp.registered && (
          <p className="mb-4 rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-2 text-sm text-green-400">
            Akun berhasil dibuat. Silakan login.
          </p>
        )}

        {process.env.NODE_ENV !== 'production' && <IsiDemoButtons />}

        <form action={loginAction} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-neutral-300">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="nama@email.com"
              className="tf-input w-full rounded-lg border border-neutral-700 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder-neutral-600 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-neutral-300">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              className="tf-input w-full rounded-lg border border-neutral-700 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder-neutral-600 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
            />
          </div>

          {sp.error && (
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {sp.error === 'ratelimit'
                ? 'Terlalu banyak percobaan login. Coba lagi dalam beberapa menit.'
                : sp.error === 'inactive'
                ? 'Akun Anda Nonaktif. Hubungi admin untuk mengaktifkan kembali.'
                : 'Email atau password salah'}
            </p>
          )}

          <button
            type="submit"
            className="tf-btn tf-head w-full rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 py-2.5 text-sm font-semibold text-white transition hover:from-blue-500 hover:to-purple-500"
          >
            Masuk
            <span className="tf-sweep" aria-hidden />
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-neutral-500">
          Belum punya akun?{' '}
          <Link href="/register" className="text-blue-400 hover:text-blue-300">
            Daftar
          </Link>
        </p>
      </div>
    </div>
  )
}

// Tema Transformers — hanya dekorasi visual (sudut menyiku, garis aksen, scan-line,
// corner bracket, shimmer tombol). Tidak mengubah warna/teks. Animasi ringan (CSS).
const TF_STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;800;900&display=swap');
.tf-card{position:relative;overflow:hidden;clip-path:polygon(16px 0,100% 0,100% calc(100% - 16px),calc(100% - 16px) 100%,0 100%,0 16px)}
.tf-card::before{content:'';position:absolute;left:0;top:0;height:2px;width:100%;background:linear-gradient(90deg,#2563eb,#9333ea);z-index:3}
.tf-scan{position:absolute;left:0;right:0;top:0;height:40px;background:linear-gradient(180deg,transparent,rgba(59,130,246,.07) 60%,rgba(59,130,246,.16));animation:tfScan 6.5s linear infinite;pointer-events:none;z-index:1}
.tf-br{position:absolute;width:18px;height:18px;animation:tfBlink 4s ease-in-out infinite;z-index:3;pointer-events:none}
.tf-br-tl{left:9px;top:9px;border-left:2px solid rgba(99,102,241,.5);border-top:2px solid rgba(99,102,241,.5)}
.tf-br-br{right:9px;bottom:9px;border-right:2px solid rgba(147,51,234,.5);border-bottom:2px solid rgba(147,51,234,.5);animation-delay:1s}
.tf-head{font-family:'Orbitron',sans-serif!important;text-transform:uppercase;letter-spacing:.5px}
.tf-input{clip-path:polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)}
.tf-btn{position:relative;clip-path:polygon(11px 0,100% 0,100% calc(100% - 11px),calc(100% - 11px) 100%,0 100%,0 11px);overflow:hidden}
.tf-sweep{position:absolute;top:0;bottom:0;left:0;width:36%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.4),transparent);animation:tfSweep 3s ease-in-out infinite;pointer-events:none}
.tf-pill{clip-path:polygon(7px 0,100% 0,100% calc(100% - 7px),calc(100% - 7px) 100%,0 100%,0 7px);border-radius:0 !important}
@keyframes tfScan{0%{transform:translateY(-40px);opacity:0}10%{opacity:1}90%{opacity:1}100%{transform:translateY(680px);opacity:0}}
@keyframes tfBlink{0%,100%{opacity:.85}50%{opacity:.35}}
@keyframes tfSweep{from{transform:translateX(-130%) skewX(-20deg)}to{transform:translateX(360%) skewX(-20deg)}}
@media (prefers-reduced-motion:reduce){.tf-scan,.tf-br,.tf-sweep{animation:none !important}}
`
