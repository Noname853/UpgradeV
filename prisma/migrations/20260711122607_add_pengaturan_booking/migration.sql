-- CreateTable
CREATE TABLE "pengaturan" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "booking_dibuka" BOOLEAN NOT NULL DEFAULT true,
    "diubah_oleh" INTEGER,
    "updated_at" DATETIME NOT NULL
);
