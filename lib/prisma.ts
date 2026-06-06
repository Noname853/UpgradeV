import path from 'node:path'
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

  // Local SQLite file (dev). Resolve to absolute path so cwd changes don't break it.
  const dbFile = raw.replace(/^file:/, '')
  const absoluteDbPath = path.isAbsolute(dbFile)
    ? dbFile
    : path.resolve(process.cwd(), dbFile)
  return new PrismaLibSql({ url: `file:${absoluteDbPath}` })
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter: buildAdapter(),
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
