-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'siswa',
    "kelas" TEXT,
    "kelompok" TEXT,
    "anggota_kelompok" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "alats" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kategori" TEXT NOT NULL,
    "stok" INTEGER NOT NULL DEFAULT 0,
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

-- CreateTable
CREATE TABLE "peminjamans" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "total_items" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'menunggu_verifikasi',
    "tanggal_pinjam" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tanggal_batas_kembali" DATETIME,
    "tanggal_kembali" DATETIME,
    "tanggal_verifikasi" DATETIME,
    "tanggal_batal" DATETIME,
    "keperluan" TEXT NOT NULL,
    "catatan" TEXT,
    "catatan_pengembalian" TEXT,
    "alasan_pembatalan" TEXT,
    "verified_by" INTEGER,
    "returned_by" INTEGER,
    "cancelled_by" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "peminjamans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "peminjamans_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "peminjamans_returned_by_fkey" FOREIGN KEY ("returned_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "peminjamans_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "peminjaman_details" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "peminjaman_id" INTEGER NOT NULL,
    "alat_id" INTEGER NOT NULL,
    "jumlah" INTEGER NOT NULL,
    "keterangan" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "peminjaman_details_peminjaman_id_fkey" FOREIGN KEY ("peminjaman_id") REFERENCES "peminjamans" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "peminjaman_details_alat_id_fkey" FOREIGN KEY ("alat_id") REFERENCES "alats" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "alats_kode_key" ON "alats"("kode");
