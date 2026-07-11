# Panduan Docker — Inventaris TKJ

Panduan belajar Docker langkah demi langkah memakai project ini.
Jalankan semua perintah di laptop kamu (yang sudah ter-install **Docker Desktop**).

> **Mau deploy ke server Ubuntu/Debian agar bisa diakses publik (domain + HTTPS)?**
> Lihat **[SERVER-DEPLOY.md](SERVER-DEPLOY.md)** — panduan lengkap memakai
> SQLite lokal + Caddy. Dokumen ini fokus ke belajar Docker di laptop.

---

## 0. Apa itu Docker? (5 istilah)

| Istilah        | Analogi                                                       |
| -------------- | ------------------------------------------------------------- |
| **Image**      | Cetakan/resep aplikasi yang sudah jadi (read-only)            |
| **Container**  | Image yang sedang berjalan (instance hidup dari image)        |
| **Layer**      | Tiap perintah di `Dockerfile` = 1 lapisan, di-cache biar cepat |
| **Multi-stage**| Build di "dapur" besar, lalu salin **hasil jadinya saja**      |
| **Volume**     | Penyimpanan terpisah agar data tidak hilang saat container mati |

---

## 1. Persiapan

1. Install **Docker Desktop** (Windows/Mac) atau Docker Engine (Linux).
2. Pastikan jalan:
   ```bash
   docker --version
   docker run hello-world
   ```
   Kalau `hello-world` muncul pesan sukses, Docker siap.

---

## 2. Kenali file Docker di project ini

- **`Dockerfile`** — resep build, 3 stage:
  1. `deps`   → `npm ci` (install dependency)
  2. `builder`→ `npm run build` (prisma generate + next build, `output: standalone`)
  3. `runner` → salin hasil build saja → image produksi kecil, user non-root
- **`.dockerignore`** — daftar yang TIDAK ikut ke image (`.git`, `node_modules`, `.env`, dll).
- **`docker-compose.yml`** — pembungkus agar cukup satu perintah untuk build + run.

---

## 3. Siapkan environment runtime

Salin template **`.env.docker.example`** menjadi **`.env.docker`** (otomatis
di-ignore git, jadi aman):

```bash
cp .env.docker.example .env.docker
```

Isi minimal untuk uji lokal (SQLite lokal di dalam Docker volume — default):

```env
DATABASE_URL=file:/app/data/prod.db
AUTH_SECRET=tempel-hasil-openssl-rand-base64-32
AUTH_TRUST_HOST=true
NEXTAUTH_URL=http://localhost:3000
# Untuk seed admin awal (lihat langkah migrasi):
ALLOW_PROD_SEED=true
SEED_ADMIN_PASSWORD=ganti-yang-kuat
SEED_SISWA_PASSWORD=ganti-yang-kuat
```

> Alternatif: mau pakai **Turso/libSQL remote**? Ganti `DATABASE_URL` jadi
> `libsql://NAMA-DB.turso.io` dan isi `DATABASE_AUTH_TOKEN`.
>
> Catatan: nilai ini diberikan saat **runtime**, bukan ter-bake ke image — itu praktik aman.

---

## 4. Build & jalankan (cara mudah — Compose)

```bash
docker compose up --build
```
- `--build` = build image dulu, lalu jalankan.
- Buka **http://localhost:3000**.
- Hentikan: tekan `Ctrl+C`, lalu `docker compose down`.

Jalankan di background (detached):
```bash
docker compose up --build -d      # jalan di belakang
docker compose logs -f            # lihat log
docker compose down               # matikan
```

---

## 5. Build & jalankan (cara manual — biar paham prosesnya)

```bash
# 1. Build image, beri nama "inventaris-tkj"
docker build -t inventaris-tkj .

# 2. Jalankan container, map port 3000, pakai env dari file
docker run --rm -p 3000:3000 --env-file .env.docker inventaris-tkj
```
- `build -t nama .` → bangun image dari Dockerfile di folder ini.
- `run` → jalankan; `--rm` hapus container saat berhenti; `-p 3000:3000` jembatan port laptop→container.

---

## 6. Migrasi database & seed

Image `runner` minimal (tanpa Prisma CLI), jadi migrasi dijalankan oleh service
**`migrate`** di `docker-compose.yml` — otomatis jalan `prisma migrate deploy`
sekali sebelum `web` nyala (`web` menunggu `migrate` selesai). Kamu tidak perlu
melakukan apa-apa; tabel dibuat otomatis di volume `db-data`.

Untuk membuat akun admin awal (sekali saja):

```bash
docker compose run --rm migrate \
  sh -c "npx tsx prisma/seed.ts && chown -R 1001:1001 /app/data"
```

> Kalau pakai Turso yang sudah dimigrasi sebelumnya, `migrate deploy` tetap aman
> dijalankan (idempoten).

---

## 7. Perintah Docker yang sering dipakai

```bash
docker images                 # daftar image
docker ps                     # container yang sedang jalan
docker ps -a                  # termasuk yang berhenti
docker logs <id|nama>         # lihat log container
docker exec -it <id> sh       # masuk ke dalam container
docker stop <id> / docker rm <id>
docker image rm inventaris-tkj
docker system prune           # bersih-bersih sampah (hati-hati)
```

---

## 8. Deploy ke mana saja (lewat registry)

```bash
docker tag inventaris-tkj USERNAME/inventaris-tkj:latest
docker push USERNAME/inventaris-tkj:latest
# lalu di server mana pun:
docker pull USERNAME/inventaris-tkj:latest
docker run -d -p 3000:3000 --env-file .env.docker USERNAME/inventaris-tkj:latest
```

> Catatan: situs ini saat ini sudah jalan di Vercel. Docker berguna kalau nanti
> mau pindah/menjalankan di VPS atau server sekolah sendiri.
