# Inventaris TKJ

Aplikasi web untuk manajemen peminjaman alat di lab TKJ. Dibuat dengan Next.js 16, Prisma 7 (SQLite via libSQL adapter), dan NextAuth v5.

## Prasyarat

- **Node.js 20+** (disarankan 22 atau 24) — sudah termasuk `npm`
- **Git**

Cek versi:
```bash
node -v
npm -v
```

> Project ini memakai **npm** (lockfile `package-lock.json`). Jangan pakai pnpm/yarn agar lockfile tidak bentrok.

## Setup pertama kali

### 1. Clone repo

```bash
git clone https://github.com/Noname853/Next7js.git
cd Next7js
```

### 2. Install dependency

```bash
npm install
```

### 3. Buat file `.env`

Copy template lalu isi nilainya:

```bash
cp .env.example .env
```

Generate `AUTH_SECRET` (Git Bash / WSL / Linux / macOS):

```bash
openssl rand -base64 32
```

Buka `.env` di editor, isi seperti ini:

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:3000"
AUTH_SECRET="tempel_hasil_openssl_disini"
```

> **Penting:** `AUTH_SECRET` **wajib** diisi. Tanpa nilai, aplikasi gagal start dengan error `AUTH_SECRET environment variable is required`. Gunakan nilai **berbeda** untuk dev dan produksi, dan jangan pernah commit `.env`.

### 4. Setup database

Sekali jalan saja — migrate + seed:

```bash
npm run setup
```

Perintah ini akan:
- Membuat file `dev.db` (SQLite)
- Menerapkan semua migration Prisma
- Mengisi data awal (admin + 3 siswa + 12 alat + contoh peminjaman)

### 5. Jalankan dev server

```bash
npm run dev
```

Buka http://localhost:3000

## Akun default

| Role  | Email           | Password   |
|-------|-----------------|------------|
| Admin | admin@tkj.com   | admin123   |
| Siswa | budi@tkj.com    | siswa123   |
| Siswa | siti@tkj.com    | siswa123   |
| Siswa | ahmad@tkj.com   | siswa123   |

> Kredensial di atas hanya untuk data seed/development. **Ganti password** ini sebelum dipakai di lingkungan nyata.

## Script yang tersedia

```bash
npm run dev        # jalankan dev server (port 3000)
npm run build      # build production
npm start          # jalankan hasil build
npm run lint       # cek lint (ESLint)
npm run typecheck  # cek tipe TypeScript (tsc --noEmit)
npm test           # jalankan unit test sekali (Vitest)
npm run test:watch # jalankan test dalam mode watch
npm run seed       # re-seed database (pakai upsert, tidak menghapus)
npm run setup      # migrate + seed (setup pertama atau reset penuh)
```

## Testing & CI

- **Unit test** memakai [Vitest](https://vitest.dev). File test diletakkan di samping kodenya (`*.test.ts`) atau di folder `__tests__/`. Jalankan dengan `npm test`.
- **CI** (GitHub Actions, `.github/workflows/ci.yml`) berjalan otomatis di setiap push & pull request ke `main`, dengan tahap: `npm ci` → `lint` → `typecheck` → `test` → `build`.

## Keamanan

Beberapa pengamanan yang sudah diterapkan:

- **Rate limiting** pada login (10 percobaan / 5 menit per IP) dan registrasi (5 / 10 menit per IP), diterapkan di server action maupun di callback `authorize` NextAuth sebagai pengaman menyeluruh.
- **Validasi input** pada API route: ID rute divalidasi numerik, parameter pagination dibatasi (maks 100), dan `role` user dibatasi whitelist.
- **Pembuatan peminjaman** memakai transaksi agar cek stok dan penyimpanan bersifat atomik (mencegah stok minus saat request bersamaan).
- **Security headers** (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) di-set lewat `next.config.ts`.

## Reset database

Kalau database rusak / mau mulai dari nol:

```bash
rm dev.db
npm run setup
```

## Troubleshooting

**Error: `AUTH_SECRET environment variable is required`**
File `.env` tidak ada atau `AUTH_SECRET` belum diisi. Cek dengan `cat .env`. Lihat langkah 3.

**Error: `JWTSessionError: no matching decryption secret` + loop redirect**
Cookie session lama dienkripsi dengan secret berbeda. Hapus cookie `http://localhost:3000` di browser (DevTools → Application → Cookies → Clear) atau pakai jendela incognito.

**Error: `The Driver Adapter undefined, based on undefined`**
Versi lama dari `lib/prisma.ts` atau `prisma/seed.ts`. Pastikan adapter diberikan sebagai instance, bukan factory function:
```ts
adapter: new PrismaLibSql({ url })   // betul
adapter: async () => new PrismaLibSql({ url })   // salah
```

**Port 3000 sudah dipakai**
Jalankan di port lain:
```bash
npm run dev -- --port 3001
```

## Struktur project

```
app/                  # Next.js App Router (pages + API routes)
  (auth)/             # halaman login & register
  (protected)/        # halaman yang butuh login
  api/                # endpoint REST
components/           # komponen UI reusable
lib/
  auth.ts             # konfigurasi NextAuth
  prisma.ts           # Prisma client singleton
  rate-limit.ts       # rate limiter in-memory
  utils.ts            # helper umum
  generated/prisma/   # client hasil generate (tidak di-commit)
prisma/
  schema.prisma       # skema database
  migrations/         # history migration
  seed.ts             # data awal
proxy.ts              # proxy/middleware (rename dari middleware.ts di Next 16)
next.config.ts        # konfigurasi Next.js + security headers
vitest.config.ts      # konfigurasi test
.github/workflows/    # pipeline CI
```

## Stack

- **Next.js 16** (App Router, Turbopack)
- **React 19**
- **Prisma 7** dengan **libSQL adapter** untuk SQLite
- **NextAuth v5 (beta)** dengan provider Credentials
- **Tailwind CSS 4** + **Radix UI**
- **TypeScript 5**
- **Vitest** untuk unit testing
