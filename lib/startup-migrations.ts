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
  // prisma/migrations/20260707162933_inventaris_lab — CREATE ... IF NOT EXISTS
  // membuat langkah-langkah ini idempoten by design.
  {
    name: 'lab_sheets (tabel)',
    sql: `CREATE TABLE IF NOT EXISTS "lab_sheets" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "nama" TEXT NOT NULL,
      "jenis" TEXT NOT NULL DEFAULT 'lab',
      "urutan" INTEGER NOT NULL DEFAULT 0
    )`,
  },
  {
    name: 'lab_items (tabel)',
    sql: `CREATE TABLE IF NOT EXISTS "lab_items" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "sheet_id" INTEGER NOT NULL,
      "nama" TEXT NOT NULL,
      "jumlah" TEXT NOT NULL DEFAULT '',
      "baik" INTEGER,
      "rusak" INTEGER,
      "deskripsi" TEXT,
      "link" TEXT,
      "foto" TEXT,
      "urutan" INTEGER NOT NULL DEFAULT 0,
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" DATETIME NOT NULL,
      CONSTRAINT "lab_items_sheet_id_fkey" FOREIGN KEY ("sheet_id") REFERENCES "lab_sheets" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
  },
  {
    name: 'lab_sheets_nama_key (index)',
    sql: 'CREATE UNIQUE INDEX IF NOT EXISTS "lab_sheets_nama_key" ON "lab_sheets"("nama")',
  },
  {
    name: 'lab_items_sheet_id_urutan_idx (index)',
    sql: 'CREATE INDEX IF NOT EXISTS "lab_items_sheet_id_urutan_idx" ON "lab_items"("sheet_id", "urutan")',
  },
]

export async function runStartupMigrations(): Promise<void> {
  for (const step of ADDITIVE_STEPS) {
    try {
      await prisma.$executeRawUnsafe(step.sql)
      // CREATE ... IF NOT EXISTS selalu "berhasil"; hanya log yang bermakna.
      if (!/IF NOT EXISTS/i.test(step.sql)) {
        logger.info({ step: step.name }, 'startup-migrations: perubahan skema diterapkan')
      }
    } catch (err) {
      const msg = String((err as { message?: unknown })?.message ?? err)
      // "duplicate column" / "already exists" -> sudah diterapkan, bukan masalah.
      if (/duplicate column|already exists/i.test(msg)) continue
      // Jangan gagalkan boot; biarkan halaman lain yang tidak butuh kolom ini
      // tetap hidup, tapi teriakkan masalahnya di log.
      logger.error({ err, step: step.name }, 'startup-migrations: gagal menerapkan perubahan skema')
    }
  }
}
