import { PrismaClient } from '@/lib/generated/prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function buildAdapter() {
  const raw = process.env.DATABASE_URL ?? 'file:./dev.db'

  // Remote libSQL (Turso) — e.g. libsql://xxx.turso.io or https://...
  if (/^(libsql|https?):\/\//i.test(raw)) {
    const authToken = process.env.DATABASE_AUTH_TOKEN
    if (!authToken) {
      throw new Error(
        'DATABASE_AUTH_TOKEN is required when DATABASE_URL points to a remote libSQL database',
      )
    }
    return new PrismaLibSql({ url: raw, authToken })
  }

  // Local SQLite file (dev). libSQL accepts file:./xxx relative to cwd.
  return new PrismaLibSql({ url: raw })
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter: buildAdapter(),
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
