# Deploy ke Server Ubuntu/Debian (Docker) — sampai bisa diakses publik

Panduan langkah demi langkah menaruh aplikasi **Inventaris TKJ** di server
(VPS / server sekolah) Ubuntu atau Debian memakai **Docker**, dengan:

- **Database:** SQLite lokal di server (disimpan di Docker volume — tanpa layanan cloud).
- **Akses publik:** lewat domain + **HTTPS otomatis** memakai **Caddy** sebagai reverse proxy.

> Ringkasan alur: install Docker → clone repo → isi `.env.docker` →
> `docker compose up` → seed admin → pasang Caddy (HTTPS) → buka firewall.

---

## 0. Prasyarat

- Server **Ubuntu 22.04/24.04** atau **Debian 12** dengan akses `sudo` (login SSH).
- **Nama domain** yang kamu kuasai (mis. `inventaris.sekolah.sch.id`).
- **DNS sudah diarahkan:** buat record **A** domain tersebut ke **IP publik server**.
  (Kalau server juga punya IPv6, tambahkan record **AAAA**.)
  Cek dari laptop: `ping inventaris.sekolah.sch.id` harus menunjuk IP server.
- Port **80** dan **443** bisa diakses dari internet (tidak diblok provider/NAT).

> HTTPS baru bisa terbit setelah DNS benar-benar mengarah ke server ini.

---

## 1. Masuk ke server & update sistem

```bash
ssh user@IP-SERVER
sudo apt update && sudo apt upgrade -y
```

---

## 2. Install Docker Engine + plugin Compose

Cara resmi (berlaku untuk Ubuntu & Debian):

```bash
# Dependency dasar
sudo apt install -y ca-certificates curl git

# Tambahkan GPG key & repo resmi Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
# CATATAN: untuk Debian, ganti kata "ubuntu" di URL di atas menjadi "debian".

sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
# (Untuk Debian, ganti juga "ubuntu" menjadi "debian" pada baris di atas.)

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Agar bisa menjalankan `docker` tanpa `sudo`:

```bash
sudo usermod -aG docker $USER
# lalu logout & login lagi (atau: newgrp docker), supaya grup baru berlaku.
```

Verifikasi:

```bash
docker --version
docker compose version
docker run --rm hello-world
```

---

## 3. Ambil kode aplikasi

```bash
cd ~
git clone https://github.com/noname853/upgradev.git inventaris-tkj
cd inventaris-tkj
```

> Kalau repositori privat, kamu perlu login (mis. `gh auth login` atau clone
> via SSH). Untuk update kode nanti cukup `git pull` di folder ini.

---

## 4. Siapkan environment runtime (`.env.docker`)

File ini menyimpan rahasia; **tidak** ikut ke git/image (sudah di-ignore).

```bash
cp .env.docker.example .env.docker
```

Buat `AUTH_SECRET` acak lalu tempel ke file:

```bash
openssl rand -base64 32
```

Edit `.env.docker` (`nano .env.docker`) — yang WAJIB diganti:

| Variabel               | Isi                                                              |
| ---------------------- | ---------------------------------------------------------------- |
| `AUTH_SECRET`          | hasil `openssl rand -base64 32`                                  |
| `NEXTAUTH_URL`         | `https://inventaris.sekolah.sch.id` (domain kamu, pakai `https`) |
| `SEED_ADMIN_PASSWORD`  | password admin awal yang kuat                                    |
| `SEED_SISWA_PASSWORD`  | password contoh siswa yang kuat                                  |

Biarkan `DATABASE_URL=file:/app/data/prod.db` dan `AUTH_TRUST_HOST=true` apa adanya.

> **Kenapa `file:/app/data/prod.db`?** Itu lokasi di dalam container yang
> dipetakan ke Docker volume `db-data`, jadi data aman walau container di-rebuild.

---

## 5. Build & jalankan aplikasi

```bash
docker compose up --build -d
```

Yang terjadi otomatis:

1. **Build** image (stage `deps` → `builder` → `runner`).
2. Service **`migrate`** jalan sekali: `prisma migrate deploy` membuat semua
   tabel di `prod.db` (di dalam volume), lalu menyerahkan kepemilikan file ke
   user aplikasi. Web menunggu langkah ini selesai.
3. Service **`web`** menyala di `127.0.0.1:3000` (belum publik — sengaja).

Cek status & log:

```bash
docker compose ps
docker compose logs -f web        # Ctrl+C untuk keluar
curl -I http://127.0.0.1:3000     # harus balas HTTP 200/307 dari server
```

---

## 6. Buat akun admin awal (seed — sekali saja)

Tabel sudah ada tapi masih kosong. Jalankan seed sekali untuk membuat akun
admin (dan beberapa data contoh):

```bash
docker compose run --rm migrate \
  sh -c "npx tsx prisma/seed.ts && chown -R 1001:1001 /app/data"
```

Seed memakai **upsert** (aman diulang, tidak menimpa data yang sudah ada).
Login default: **`admin@tkj.com`** dengan password dari `SEED_ADMIN_PASSWORD`.

> Setelah login pertama, ganti password admin lewat aplikasi. Seed berikutnya
> tidak akan menimpanya.

---

## 7. Pasang Caddy = HTTPS otomatis (reverse proxy)

Aplikasi hanya mendengarkan di localhost. Caddy yang menghadap internet,
menangani TLS, dan meneruskan ke aplikasi.

Install Caddy (repo resmi):

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | \
  sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | \
  sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
```

Pasang konfigurasi (ganti domain dengan milikmu):

```bash
sudo cp deploy/Caddyfile.example /etc/caddy/Caddyfile
sudo nano /etc/caddy/Caddyfile      # ganti "inventaris.contoh.sch.id"
sudo systemctl reload caddy
```

Caddy otomatis mengambil sertifikat Let's Encrypt (butuh DNS sudah benar +
port 80/443 terbuka). Lihat prosesnya:

```bash
sudo systemctl status caddy
sudo journalctl -u caddy -f
```

---

## 8. Buka firewall (kalau UFW aktif)

```bash
sudo ufw allow OpenSSH        # jangan sampai terkunci dari SSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

Port **3000 tidak perlu dibuka** — hanya Caddy (80/443) yang menghadap publik.

---

## 9. Verifikasi

Dari laptop, buka: **`https://inventaris.sekolah.sch.id`**

- Gembok HTTPS muncul (sertifikat valid).
- Halaman login tampil → login sebagai `admin@tkj.com`.

Selesai — aplikasi sudah online dan bisa diakses publik. 🎉

---

## 10. Operasional harian

**Update ke versi terbaru:**

```bash
cd ~/inventaris-tkj
git pull
docker compose up --build -d      # migrate deploy jalan lagi (idempoten)
```

**Lihat log / status:**

```bash
docker compose logs -f web
docker compose ps
```

**Restart / matikan:**

```bash
docker compose restart web
docker compose down               # matikan (data tetap di volume)
```

**Backup database** (isi volume SQLite) — jalankan rutin, mis. via cron:

```bash
docker compose run --rm \
  -v "$PWD/backups:/backup" \
  migrate sh -c "cp /app/data/prod.db /backup/prod-$(date +%F-%H%M).db"
```

Restore: hentikan web, salin file `.db` kembali ke volume di `/app/data/prod.db`,
lalu `docker compose up -d`.

---

## Troubleshooting

| Gejala                                    | Kemungkinan sebab & solusi                                                                                   |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Caddy gagal terbitkan sertifikat          | DNS belum mengarah ke IP server, atau port 80/443 diblok. Cek `dig +short DOMAIN` dan `sudo journalctl -u caddy`. |
| `curl 127.0.0.1:3000` gagal               | Web belum siap / migrate gagal. Cek `docker compose logs migrate` dan `logs web`.                            |
| Halaman 500 "no such table"               | Seed/migrate belum jalan. Ulangi langkah 5–6.                                                                |
| "Refusing to seed in production"          | `ALLOW_PROD_SEED=true` + `SEED_ADMIN_PASSWORD` + `SEED_SISWA_PASSWORD` belum diisi di `.env.docker`.         |
| Login berhasil lalu balik ke login        | `NEXTAUTH_URL` tidak sama dengan domain HTTPS, atau `AUTH_TRUST_HOST` bukan `true`.                          |
| Data hilang setelah rebuild               | Pastikan tidak menghapus volume. `docker compose down -v` MENGHAPUS volume — jangan pakai `-v` untuk update. |

---

## Alternatif reverse proxy: Nginx + Certbot

Kalau kamu lebih memilih Nginx:

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

`/etc/nginx/sites-available/inventaris` (aktifkan dengan symlink ke `sites-enabled`):

```nginx
server {
    server_name inventaris.sekolah.sch.id;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        "upgrade";
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/inventaris /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d inventaris.sekolah.sch.id   # terbitkan HTTPS otomatis
```

Header `X-Forwarded-Proto https` di atas penting agar NextAuth tahu koneksi HTTPS.
