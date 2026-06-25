// ============================================================================
// Script migrasi Plan B (Unit Split) untuk database Turso.
//
// Cara pakai:
//   1. Pastikan file .env di root project berisi:
//        DATABASE_URL=libsql://NAMA-DB.turso.io
//        DATABASE_AUTH_TOKEN=token-turso-kamu
//      (ambil dari Vercel → Settings → Environment Variables → reveal value)
//   2. Jalankan:  node scripts/apply-unit-migration.mjs
//
// Script ini DESTRUKTIF: menghapus tabel alats lama, peminjaman_details lama,
// dan semua baris peminjamans. Data user (akun) TIDAK tersentuh.
// ============================================================================

import 'dotenv/config'
import { createClient } from '@libsql/client'

const url = process.env.DATABASE_URL
const authToken = process.env.DATABASE_AUTH_TOKEN

if (!url) {
  console.error('❌ DATABASE_URL tidak ditemukan di .env')
  process.exit(1)
}
if (!/^(libsql|https?):\/\//i.test(url)) {
  console.error('❌ DATABASE_URL bukan Turso/libSQL. Script ini hanya untuk Turso.')
  process.exit(1)
}
if (!authToken) {
  console.error('❌ DATABASE_AUTH_TOKEN tidak ditemukan di .env')
  process.exit(1)
}

const client = createClient({ url: url.replace(/^libsql:\/\//i, 'https://'), authToken })

// Tiap statement dijalankan terpisah (libSQL HTTP tidak menerima multi-statement).
const statements = [
  `DELETE FROM "peminjamans"`,
  `DROP TABLE IF EXISTS "peminjaman_details"`,
  `DROP TABLE IF EXISTS "alats"`,
  `CREATE TABLE "alats" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nama" TEXT NOT NULL,
    "kategori" TEXT NOT NULL,
    "lokasi" TEXT NOT NULL DEFAULT '',
    "deskripsi" TEXT,
    "foto" TEXT,
    "tanggal_eos" DATETIME,
    "tanggal_eol" DATETIME,
    "keterangan_eos" TEXT,
    "keterangan_eol" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
  )`,
  `CREATE UNIQUE INDEX "alats_nama_key" ON "alats"("nama")`,
  `CREATE TABLE "units" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "kode" TEXT NOT NULL,
    "alat_id" INTEGER NOT NULL,
    "kondisi" TEXT NOT NULL DEFAULT 'baik',
    "catatan" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "units_alat_id_fkey" FOREIGN KEY ("alat_id") REFERENCES "alats" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX "units_kode_key" ON "units"("kode")`,
  `CREATE TABLE "peminjaman_details" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "peminjaman_id" INTEGER NOT NULL,
    "unit_id" INTEGER NOT NULL,
    "keterangan" TEXT,
    "kerusakan" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "peminjaman_details_peminjaman_id_fkey" FOREIGN KEY ("peminjaman_id") REFERENCES "peminjamans" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "peminjaman_details_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
  // Catat migrasi ini di _prisma_migrations supaya Prisma tahu sudah jalan.
  `INSERT INTO "_prisma_migrations" ("id","checksum","migration_name","started_at","applied_steps_count","finished_at")
   VALUES (lower(hex(randomblob(16))), 'manual', '20260625120000_unit_split', CURRENT_TIMESTAMP, 1, CURRENT_TIMESTAMP)`,
]

console.log('🚀 Memulai migrasi Plan B (Unit Split) ke Turso...\n')

for (const [i, sql] of statements.entries()) {
  const label = sql.trim().split('\n')[0].slice(0, 60)
  try {
    await client.execute(sql)
    console.log(`✅ [${i + 1}/${statements.length}] ${label}`)
  } catch (err) {
    // INSERT ke _prisma_migrations boleh gagal (tabel mungkin tidak ada) — abaikan.
    if (sql.includes('_prisma_migrations')) {
      console.log(`⏭️  [${i + 1}/${statements.length}] lewati catatan migrasi (opsional)`)
      continue
    }
    console.error(`\n❌ Gagal di statement ${i + 1}: ${label}`)
    console.error(err.message)
    process.exit(1)
  }
}

console.log('\n✅ Migrasi selesai! Tabel alats, units, peminjaman_details sudah dibuat ulang.')
console.log('   Sekarang refresh https://codexb5m.my.id/dashboard — harusnya sudah jalan.')
console.log('   Lalu import data alat & unit lewat menu Alat → Import Excel.')

process.exit(0)
