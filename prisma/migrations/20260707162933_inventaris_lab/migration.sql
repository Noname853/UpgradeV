-- CreateTable
CREATE TABLE "lab_sheets" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nama" TEXT NOT NULL,
    "jenis" TEXT NOT NULL DEFAULT 'lab',
    "urutan" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "lab_items" (
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
);

-- CreateIndex
CREATE UNIQUE INDEX "lab_sheets_nama_key" ON "lab_sheets"("nama");

-- CreateIndex
CREATE INDEX "lab_items_sheet_id_urutan_idx" ON "lab_items"("sheet_id", "urutan");
