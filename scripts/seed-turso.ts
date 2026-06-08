import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";

async function main() {
  const url = process.env.DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error("DATABASE_URL and DATABASE_AUTH_TOKEN are required");
    process.exit(1);
  }

  const db = createClient({ url, authToken });

  console.log("Seeding database...");

  const adminPassword = await bcrypt.hash(
    process.env.SEED_ADMIN_PASSWORD ?? "admin123",
    10
  );
  const siswaPassword = await bcrypt.hash(
    process.env.SEED_SISWA_PASSWORD ?? "siswa123",
    10
  );

  const now = new Date().toISOString();

  // Users
  const users = [
    { name: "Administrator", email: "admin@tkj.com", password: adminPassword, role: "admin", is_active: 1, kelas: null, kelompok: null },
    { name: "Budi Santoso",  email: "budi@tkj.com",  password: siswaPassword, role: "siswa", is_active: 1, kelas: "XII TKJ 1", kelompok: "Kelompok A" },
    { name: "Siti Rahayu",   email: "siti@tkj.com",  password: siswaPassword, role: "siswa", is_active: 1, kelas: "XII TKJ 1", kelompok: "Kelompok A" },
    { name: "Ahmad Fauzi",   email: "ahmad@tkj.com", password: siswaPassword, role: "siswa", is_active: 1, kelas: "XI TKJ 2",  kelompok: "Kelompok B" },
  ];

  for (const u of users) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO users (name, email, password, role, is_active, kelas, kelompok, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [u.name, u.email, u.password, u.role, u.is_active, u.kelas, u.kelompok, now, now],
    });
  }
  console.log("Users seeded.");

  // Alat
  const alats = [
    { kode: "JRN001", nama: "Switch TP-Link 24 Port",  kategori: "Jaringan",    stok: 5,  lokasi: "Lab Jaringan" },
    { kode: "JRN002", nama: "Router Mikrotik RB750",   kategori: "Jaringan",    stok: 3,  lokasi: "Lab Jaringan" },
    { kode: "JRN003", nama: "Patch Panel 24 Port",     kategori: "Jaringan",    stok: 2,  lokasi: "Lab Jaringan" },
    { kode: "KMP001", nama: "Laptop Acer Aspire",      kategori: "Komputer",    stok: 10, lokasi: "Lab Komputer" },
    { kode: "KMP002", nama: "Raspberry Pi 4",          kategori: "Komputer",    stok: 8,  lokasi: "Lab Komputer" },
    { kode: "KMP003", nama: "Arduino Uno R3",          kategori: "Komputer",    stok: 15, lokasi: "Lab Komputer" },
    { kode: "KBL001", nama: "Kabel UTP Cat6 (meter)",  kategori: "Kabel",       stok: 50, lokasi: "Gudang" },
    { kode: "KBL002", nama: "Kabel HDMI 2m",           kategori: "Kabel",       stok: 20, lokasi: "Gudang" },
    { kode: "ALU001", nama: "Multimeter Digital",      kategori: "Alat Ukur",   stok: 6,  lokasi: "Lab Elektronik" },
    { kode: "ALU002", nama: "Tang Crimping",           kategori: "Alat Ukur",   stok: 12, lokasi: "Lab Elektronik" },
    { kode: "ALU003", nama: "Tester Kabel",            kategori: "Alat Ukur",   stok: 8,  lokasi: "Lab Elektronik" },
    { kode: "ALU004", nama: "Solder Station",          kategori: "Alat Ukur",   stok: 4,  lokasi: "Lab Elektronik" },
  ];

  for (const a of alats) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO alats (kode, nama, kategori, stok, lokasi, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [a.kode, a.nama, a.kategori, a.stok, a.lokasi, now, now],
    });
  }
  console.log("Alat seeded.");

  const r = await db.execute("SELECT id, email FROM users ORDER BY id");
  const adminId = r.rows.find((row) => row.email === "admin@tkj.com")?.id as number;
  const budiId  = r.rows.find((row) => row.email === "budi@tkj.com")?.id as number;
  const sitiId  = r.rows.find((row) => row.email === "siti@tkj.com")?.id as number;
  const ahmadId = r.rows.find((row) => row.email === "ahmad@tkj.com")?.id as number;

  console.log("Seed complete!");
  console.log(`Admin: admin@tkj.com / ${process.env.SEED_ADMIN_PASSWORD ?? "admin123"}`);
  console.log(`Siswa: budi@tkj.com  / ${process.env.SEED_SISWA_PASSWORD ?? "siswa123"}`);

  db.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
