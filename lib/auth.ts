import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, clientIp } from '@/lib/rate-limit'
import bcrypt from 'bcryptjs'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const authSecret = process.env.AUTH_SECRET
if (!authSecret) {
  throw new Error('AUTH_SECRET environment variable is required')
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: authSecret,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, request) {
        // Safety net that also covers direct calls to the NextAuth endpoint
        // (the login form's server action has its own limiter). Skipped when
        // no client IP is available so a shared bucket can't lock everyone out.
        const ip = clientIp(request.headers)
        if (ip !== 'unknown' && !(await checkRateLimit(`auth:${ip}`, 10, 5 * 60_000))) {
          logger.warn({ ip }, 'auth:rate_limit')
          return null
        }

        const parsed = z
          .object({
            email: z.string().email(),
            password: z.string().min(1),
          })
          .safeParse(credentials)

        if (!parsed.success) {
          logger.warn('auth:invalid_credentials_format')
          return null
        }

        let user
        try {
          user = await prisma.user.findUnique({
            where: { email: parsed.data.email },
          })
        } catch (err) {
          logger.error({ err }, 'auth:authorize db error')
          return null
        }

        if (!user) {
          logger.warn({ email: parsed.data.email }, 'auth:user_not_found')
          return null
        }
        if (!user.isActive) {
          logger.warn({ email: parsed.data.email, isActive: user.isActive }, 'auth:user_inactive')
          return null
        }
        const valid = await bcrypt.compare(parsed.data.password, user.password)
        if (!valid) {
          logger.warn({ email: parsed.data.email }, 'auth:invalid_password')
          return null
        }

        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          role: user.role,
          kelas: user.kelas ?? null,
        }
      },
    }),
  ],
  // Token kedaluwarsa 8 jam, diperbarui maksimal tiap 15 menit. Membatasi
  // jendela waktu sebuah sesi tetap valid setelah akun diubah/dinonaktifkan.
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60, updateAge: 15 * 60 },
  callbacks: {
    async jwt({ token, user }) {
      // Saat login: simpan identitas awal ke token.
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string }).role
        token.kelas = (user as { kelas?: string | null }).kelas
        return token
      }

      // Request berikutnya: validasi ulang ke DB agar perubahan role dan
      // penonaktifan akun langsung berlaku (tidak menunggu token kedaluwarsa).
      if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: Number(token.id) },
            select: { isActive: true, role: true, kelas: true, name: true },
          })
          // Akun hilang atau dinonaktifkan -> batalkan sesi.
          if (!dbUser || !dbUser.isActive) return null
          token.role = dbUser.role
          token.kelas = dbUser.kelas ?? null
          token.name = dbUser.name
        } catch (err) {
          // Gagal akses DB: pertahankan token lama agar gangguan DB sesaat
          // tidak melogout semua orang (fail-open demi ketersediaan).
          logger.error({ err }, 'auth:jwt revalidate failed')
        }
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as string
      session.user.kelas = (token.kelas as string | null) ?? null
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
})
