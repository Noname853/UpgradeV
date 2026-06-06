import { signIn } from '@/lib/auth'
import { AuthError } from 'next-auth'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { checkRateLimit, clientIp } from '@/lib/rate-limit'
import Link from 'next/link'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; registered?: string }>
}) {
  const sp = await searchParams

  async function loginAction(formData: FormData) {
    'use server'
    const ip = clientIp(await headers())
    if (!checkRateLimit(`login:${ip}`, 10, 5 * 60_000)) {
      redirect('/login?error=ratelimit')
    }
    try {
      await signIn('credentials', {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
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
    <div className="glass-card w-full max-w-sm p-8">
      <h1 className="mb-1 text-2xl font-bold text-white">Masuk</h1>
      <p className="mb-6 text-sm text-neutral-400">Silakan login untuk melanjutkan</p>

      {sp.registered && (
        <p className="mb-4 rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-2 text-sm text-green-400">
          Akun berhasil dibuat. Silakan login.
        </p>
      )}

      <form action={loginAction} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm text-neutral-300">Email</label>
          <input
            name="email"
            type="email"
            required
            placeholder="admin@tkj.com"
            className="w-full rounded-lg border border-neutral-700 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder-neutral-600 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-neutral-300">Password</label>
          <input
            name="password"
            type="password"
            required
            placeholder="••••••••"
            className="w-full rounded-lg border border-neutral-700 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder-neutral-600 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
          />
        </div>

        {sp.error && (
          <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {sp.error === 'ratelimit'
              ? 'Terlalu banyak percobaan login. Coba lagi dalam beberapa menit.'
              : 'Email atau password salah'}
          </p>
        )}

        <button
          type="submit"
          className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 py-2.5 text-sm font-semibold text-white transition hover:from-blue-500 hover:to-purple-500"
        >
          Masuk
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-neutral-500">
        Belum punya akun?{' '}
        <Link href="/register" className="text-blue-400 hover:text-blue-300">
          Daftar
        </Link>
      </p>
    </div>
  )
}
