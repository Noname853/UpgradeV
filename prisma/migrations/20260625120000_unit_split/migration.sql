-- ============================================================================
-- Unit Split Migration
--
-- Memisahkan tabel `alats` (yang sebelumnya menggabungkan jenis alat + unit
-- fisik) menjadi:
--   - `alats` (jenis alat, 1 baris per jenis)
--   - `units` (unit fisik, 1 baris per unit dengan kode unik & kondisi)
--
-- Asumsi: data `alats` & `peminjaman_details` sudah dikosongkan sebelum
-- migrasi ini dijalankan. Migrasi ini DESTRUKTIF untuk tabel tersebut.
-- ============================================================================

-- Drop old foreign key dependent tables first.
-- Peminjamans yang lama akan kehilangan detail-nya — kita kosongkan juga supaya
-- tidak ada peminjaman zombie (0 item).
DELETE FROM "peminjamans";
DROP TABLE IF EXISTS "peminjaman_details";
DROP TABLE IF EXISTS "alats";

-- Recreate alats with new schema (no kode, no stok, nama is now unique)
CREATE TABLE "alats" (
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
);

CREATE UNIQUE INDEX "alats_nama_key" ON "alats"("nama");

-- Create new units table
CREATE TABLE "units" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "kode" TEXT NOT NULL,
    "alat_id" INTEGER NOT NULL,
    "kondisi" TEXT NOT NULL DEFAULT 'baik',
    "catatan" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "units_alat_id_fkey" FOREIGN KEY ("alat_id") REFERENCES "alats" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "units_kode_key" ON "units"("kode");

-- Recreate peminjaman_details with new schema (unit_id instead of alat_id, no jumlah, add kerusakan)
CREATE TABLE "peminjaman_details" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "peminjaman_id" INTEGER NOT NULL,
    "unit_id" INTEGER NOT NULL,
    "keterangan" TEXT,
    "kerusakan" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "peminjaman_details_peminjaman_id_fkey" FOREIGN KEY ("peminjaman_id") REFERENCES "peminjamans" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "peminjaman_details_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
