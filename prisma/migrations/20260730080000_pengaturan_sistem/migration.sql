-- AlterTable
ALTER TABLE "pengaturan" ADD COLUMN "jam_buka" INTEGER NOT NULL DEFAULT 6;
ALTER TABLE "pengaturan" ADD COLUMN "jam_tutup" INTEGER NOT NULL DEFAULT 17;
ALTER TABLE "pengaturan" ADD COLUMN "max_unit_siswa" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "pengaturan" ADD COLUMN "max_hari" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "pengaturan" ADD COLUMN "verifikasi_otomatis" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "pengaturan" ADD COLUMN "peringatan_keterlambatan" BOOLEAN NOT NULL DEFAULT true;
