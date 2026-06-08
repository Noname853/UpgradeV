import { PrismaClient } from '@/lib/generated/prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client/http'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

// Force HTTP client so Vercel's native libsql addon is never selected.
class PrismaLibSqlHttp extends PrismaLibSql {
  override createClient(config: Parameters<typeof createClient>[0]) {
    return createClient(config)
  }
}

function buildAdapter() {
  const raw = process.env.DATABASE_URL ?? 'file:./dev.db'

  // Remote libSQL (Turso) — use HTTP client explicitly
  if (/^(libsql|https?):\/\//i.test(raw)) {
    const authToken = process.env.DATABASE_AUTH_TOKEN
    if (!authToken) {
      throw new Error(
        'DATABASE_AUTH_TOKEN is required when DATABASE_URL points to a remote libSQL database',
      )
    }
    const url = raw.replace(/^libsql:\/\//i, 'https://')
    return new PrismaLibSqlHttp({ url, authToken })
  }

  // Local SQLite file (dev).
  return new PrismaLibSql({ url: raw })
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter: buildAdapter(),
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
