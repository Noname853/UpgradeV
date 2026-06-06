import path from 'node:path'
import { PrismaClient } from '@/lib/generated/prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

const dbFile = (process.env.DATABASE_URL ?? 'file:./dev.db').replace(/^file:/, '')
const absoluteDbPath = path.resolve(process.cwd(), dbFile)
const url = `file:${absoluteDbPath}`

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter: new PrismaLibSql({ url }),
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
