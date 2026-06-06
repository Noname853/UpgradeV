import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, clientIp } from '@/lib/rate-limit'
import bcrypt from 'bcryptjs'
import Link from 'next/link'

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const sp = await searchParams

  async function registerAction(formData: FormData) {
    'use server'
    const ip = clientIp(await headers())
    if (!checkRateLimit(`register:${ip}`, 5, 10 * 60_000)) {
      redirect('/register?error=ratelimit')
    }

    const name = (formData.get('name') as string).trim()
    const email = (formData.get('email') as string).trim().toLowerCase()
    const password = formData.get('password') as string
    const kelas = (formData.get('kelas') as string).trim()

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) redirect('/register?error=email-taken')

    const hashed = await bcrypt.hash(password, 10)
    await prisma.user.create({
      data: { name, email, password: hashed, kelas: kelas || null, role: 'siswa' },
    })
    redirect('/login?registered=1')
  }

  const errorMsg =
    sp.error === 'email-taken'
      ? 'Email sudah terdaftar'
      : sp.error === 'ratelimit'
        ? 'Terlalu banyak percobaan. Coba lagi dalam beberapa menit.'
        : sp.error
          ? 'Gagal mendaftar, coba lagi'
          : null

  return (
    <div className="glass-card w-full max-w-sm p-8">
      <h1 className="mb-1 text-2xl font-bold text-white">Daftar</h1>
      <p className="mb-6 text-sm text-neutral-400">Buat akun siswa baru</p>

      <form action={registerAction} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm text-neutral-300">Nama Lengkap</label>
          <input
            name="name"
            required
            placeholder="Budi Santoso"
            className="w-full rounded-lg border border-neutral-700 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder-neutral-600 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-neutral-300">Email</label>
          <input
            name="email"
            type="email"
            required
            placeholder="budi@tkj.com"
            className="w-full rounded-lg border border-neutral-700 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder-neutral-600 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-neutral-300">Kelas</label>
          <input
            name="kelas"
            placeholder="XII TKJ 1"
            className="w-full rounded-lg border border-neutral-700 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder-neutral-600 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-neutral-300">Password</label>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            placeholder="Minimal 6 karakter"
            className="w-full rounded-lg border border-neutral-700 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder-neutral-600 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
          />
        </div>

        {errorMsg && (
          <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {errorMsg}
          </p>
        )}

        <button
          type="submit"
          className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 py-2.5 text-sm font-semibold text-white transition hover:from-blue-500 hover:to-purple-500"
        >
          Daftar Sekarang
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-neutral-500">
        Sudah punya akun?{' '}
        <Link href="/login" className="text-blue-400 hover:text-blue-300">
          Masuk
        </Link>
      </p>
    </div>
  )
}
