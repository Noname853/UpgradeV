<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Inventaris TKJ — Panduan Agent

Aplikasi web manajemen peminjaman alat lab TKJ. Semua kode aplikasi & pesan UI
memakai **Bahasa Indonesia** — ikuti gaya ini saat menambah teks, komentar,
commit, dan penamaan domain (`peminjaman`, `alat`, `unit`, `pengembalian`).

## Stack

- **Next.js 16** (App Router + Turbopack) — bukan versi yang kamu hafal, lihat blok peringatan di atas
- **React 19**
- **Prisma 7** dengan **libSQL adapter** (SQLite lokal `dev.db`, Turso di produksi)
- **NextAuth v5 (beta)** — provider Credentials, sesi JWT
- **Tailwind CSS 4** + **Radix UI** (komponen di `components/`)
- **TypeScript 5** (strict), **Zod 4** untuk validasi
- **Vitest** unit test, **Playwright** e2e (`e2e/`)

## Struktur penting

```
app/(auth)/           # login & register (rute publik)
app/(protected)/      # semua halaman butuh login (layout cek sesi)
app/api/              # REST endpoint (users, alat, units, peminjaman, laporan, lab-inventaris, dashboard)
components/           # UI reusable: dashboard/ layout/ peminjaman/ shared/
lib/
  auth.ts             # konfigurasi NextAuth v5 + callback authorize
  prisma.ts           # Prisma client singleton (libSQL adapter)
  rate-limit.ts       # rate limiter (Upstash Redis / in-memory fallback)
  validations.ts      # skema Zod
  rules.ts            # aturan bisnis peminjaman (jam buka, batas kembali)
  csrf.ts             # proteksi CSRF
  logger.ts           # pino logger
  lab-inventaris.ts   # logika sensus inventaris lab
  laporan.ts          # ekspor laporan (ExcelJS)
  startup-migrations.ts
  generated/prisma/   # client hasil `prisma generate` (TIDAK di-commit)
prisma/
  schema.prisma       # skema DB (User, Alat, Unit, Peminjaman, PeminjamanDetail, LabSheet, LabItem)
  migrations/         # jangan edit migration lama; buat baru
  seed.ts             # data awal (admin, siswa, alat, contoh peminjaman)
proxy.ts              # middleware Next 16 (auth guard + CSP berbasis nonce per-request)
next.config.ts        # security headers + serverActions bodySizeLimit
scripts/              # backup-db, migrate/seed Turso, apply-unit-migration
```

## Model domain (Prisma)

- **User** — `role` `admin` | `siswa`; punya `kelas`, `kelompok`, `anggotaKelompok`.
- **Alat** — jenis barang (nama unik, kategori, lokasi, EOS/EOL). Bukan yang dipinjam langsung.
- **Unit** — instance fisik berkode QR (`kode` unik) dari sebuah `Alat`. **Ini yang dipinjam.**
- **Peminjaman** — satu transaksi; `status`: `menunggu_verifikasi` → `dipinjam` → `dikembalikan` (atau `dibatalkan`). Punya `PeminjamanDetail[]` (unit-unit yang dipinjam).
- **LabSheet / LabItem** — sensus inventaris lab (dari impor Excel), **terpisah** dari sistem unit-berkode yang bisa dipinjam. Jangan campur keduanya.

## Perintah

```bash
npm run dev        # dev server (port 3000, host 0.0.0.0)
npm run build      # prisma generate + next build
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm test           # Vitest sekali
npm run test:e2e   # Playwright
npm run seed       # re-seed (upsert, tidak menghapus)
npm run setup      # migrate dev + seed (setup awal / reset penuh)
```

## Sebelum menyelesaikan perubahan

Wajib lulus sebelum commit — CI (`.github/workflows/ci.yml`) menjalankan urutan yang sama:

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

## Aturan kerja

- **Baca dulu, tulis kemudian.** Untuk API Next.js 16 yang berbeda dari ingatanmu, cek `node_modules/next/dist/docs/` sebelum menulis kode.
- **Jangan edit** `lib/generated/prisma/` (hasil generate) atau migration Prisma yang sudah ada. Ubah `schema.prisma` lalu buat migration baru.
- **Prisma adapter** diberikan sebagai instance, bukan factory: `new PrismaLibSql({ url })`.
- **Autentikasi**: rute di `app/(protected)/` diproteksi lewat `proxy.ts` + `lib/auth.ts`. Cek `role` untuk aksi khusus admin (verifikasi, kelola alat/user, laporan).
- **Validasi input** pakai Zod (`lib/validations.ts`); batasi pagination (maks 100) dan validasi ID numerik pada API route.
- **Peminjaman** dibuat dalam transaksi Prisma agar cek stok & simpan bersifat atomik (cegah stok minus / double-book).
- **Rate limiting** sudah dipasang di login & registrasi — pertahankan saat menyentuh alur auth.
- **Security headers & CSP**: header statis di `next.config.ts`, CSP berbasis nonce per-request di `proxy.ts`. Jangan longgarkan tanpa alasan.
- **Jangan commit** `.env`, `dev.db`, atau `lib/generated/`.
- Tulis unit test di samping kodenya (`*.test.ts`) atau di `__tests__/`.
