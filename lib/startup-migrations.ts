import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// Penambal skema saat boot (jaring pengaman deploy).
//
// Kenapa ada: produksi memakai Turso/libSQL dan `prisma migrate deploy` harus
// dijalankan manual saat deploy — langkah yang terbukti mudah terlewat dan
// membuat aplikasi 500 karena kolom belum ada. Daftar di bawah berisi
// perubahan skema ADITIF yang aman diulang (idempoten): dicoba setiap boot,
// dan "sudah ada" bukan error.
//
// Catatan: ini pelengkap, bukan pengganti `prisma migrate deploy`. Setiap
// entri tetap harus punya file migrasi resmi di prisma/migrations agar
// database baru (setup dari nol) tetap konsisten.

const ADDITIVE_STEPS: { name: string; sql: string }[] = [
  {
    // prisma/migrations/20260706034242_catatan_dibaca
    name: 'peminjamans.catatan_dibaca_at',
    sql: 'ALTER TABLE "peminjamans" ADD COLUMN "catatan_dibaca_at" DATETIME',
  },
]

export async function runStartupMigrations(): Promise<void> {
  for (const step of ADDITIVE_STEPS) {
    try {
      await prisma.$executeRawUnsafe(step.sql)
      logger.info({ step: step.name }, 'startup-migrations: perubahan skema diterapkan')
    } catch (err) {
      const msg = String((err as { message?: unknown })?.message ?? err)
      // SQLite: "duplicate column name: ..." -> kolom sudah ada, bukan masalah.
      if (/duplicate column/i.test(msg)) continue
      // Jangan gagalkan boot; biarkan halaman lain yang tidak butuh kolom ini
      // tetap hidup, tapi teriakkan masalahnya di log.
      logger.error({ err, step: step.name }, 'startup-migrations: gagal menerapkan perubahan skema')
    }
  }
}
