# Prompt Redesain Mobile — Inventaris TKJ

> Salin salah satu versi (Indonesia **atau** English) ke Claude/tool desain.
> Keduanya identik isinya. Prompt ini sudah berisi konteks teknis nyata dari
> project supaya hasil desainnya konsisten dengan arsitektur yang ada.

---

## 🇮🇩 VERSI BAHASA INDONESIA

Kamu adalah desainer produk & UI/UX senior yang ahli mobile-first web app. Aku
punya aplikasi web bernama **Inventaris TKJ** dan aku ingin kamu **mendesain
 ulang tampilan versi mobile-nya** supaya jauh lebih menarik, modern, tidak
monoton, dan terasa interaktif buat pengguna — tanpa mengubah alur/fitur inti.

### Tentang aplikasi
Aplikasi manajemen **peminjaman alat laboratorium TKJ** (Teknik Komputer &
Jaringan) untuk sekolah. Siswa meminjam alat lab lewat scan QR, admin
memverifikasi & mengelola inventaris. Seluruh teks UI **berbahasa Indonesia**.

**Stack teknis (harus dipatuhi dalam desain):**
- Next.js 16 (App Router) + React 19
- Tailwind CSS 4 + Radix UI (jadi pakai utilitas Tailwind & pola komponen headless)
- PWA — bisa di-install ke home screen (mode `standalone`, `portrait`)
- Dark theme sebagai default

### Dua peran pengguna (dua "rasa" desain)
1. **Siswa (peminjam)** — tema gelap "original": background hitam `#000000`,
   aksen biru `#0070f3` → ungu `#7928ca` (gradient), kartu `#111111` border
   `#1f1f1f`, ada utilitas `.glass-card` dan `.gradient-text`. Prioritas: ramah,
   mudah, cepat, menyenangkan dipakai remaja SMK.
2. **Admin** — tema **"HUD / Transformers"**: futuristik, sudut ter-chamfer
   (clip-path miring), garis tipis biru-ungu neon, font Orbitron/Rajdhani,
   panel semi-transparan, hover angkat (`translateY`). Prioritas: padat
   informasi, tegas, terasa seperti "command center".

> Pertahankan **dua identitas visual berbeda** ini. Siswa = friendly & playful,
> Admin = HUD command-center. Jangan seragamkan keduanya.

### Struktur navigasi mobile yang sudah ada (pertahankan & sempurnakan)
- **App Bar** atas: judul per-halaman, tombol kembali di sub-halaman, tombol
  menu (admin) / lonceng notifikasi.
- **Bottom Navigation** (4 tab): **Dashboard**, **Katalog Alat**,
  **Peminjaman**, **Profil**.

### Halaman & fitur yang perlu didesain (mobile)
**Umum / Siswa:**
- **Dashboard** — kartu statistik (StatCard), grafik aktivitas, banner catatan
  admin, popup notifikasi saat login, toggle mode booking.
- **Katalog Alat** — daftar jenis alat (nama, kategori, lokasi), badge stok,
  detail alat, unit fisik ber-QR.
- **Buat Peminjaman** — pilih alat/unit, **scan QR kamera**, keranjang, submit.
- **Peminjaman Saya** — daftar transaksi + status: `menunggu_verifikasi` →
  `dipinjam` → `dikembalikan` / `dibatalkan`. Badge status berwarna. Arsip.
- **Detail Peminjaman** — unit yang dipinjam, catatan admin, aksi.
- **Profil** — data diri, pengaturan, tombol keluar.

**Khusus Admin:**
- **Verifikasi peminjaman** (approve/tolak), **scan pengembalian**.
- **Kelola Alat/Unit** — tambah, edit, impor Excel, cetak **label QR**.
- **Inventaris Lab** — sensus alat lab (impor/ekspor Excel), terpisah dari unit
  yang dipinjam.
- **Laporan** — ekspor Excel.
- **Kelola Users** — daftar, tambah, edit, detail (role admin/siswa).

### Yang aku mau kamu perbaiki (inti request)
1. **Jangan monoton** — hilangkan tampilan "daftar-daftar datar" yang kaku.
   Tambah hierarki visual, kartu yang hidup, ikon bermakna, ilustrasi/empty-state
   yang ramah, dan variasi layout antar halaman.
2. **Interaktif** — mikro-interaksi & animasi halus: transisi antar halaman,
   feedback saat tap, skeleton loading, pull-to-refresh, swipe pada kartu
   peminjaman (mis. geser untuk aksi cepat), animasi sukses saat scan QR
   berhasil, badge status yang beranimasi, haptic-like feedback visual.
3. **Mobile-first sungguhan** — target jempol (tap target ≥ 44px), bottom-sheet
   untuk aksi/detail (bukan modal desktop), sticky action button, aman terhadap
   safe-area (notch & home indicator), one-hand reachability.
4. **State jelas** — desain eksplisit untuk: loading (skeleton), kosong (empty
   state ilustratif), error, sukses. Jangan hanya "happy path".
5. **Alur scan QR** yang mulus — layar kamera, panduan framing, animasi deteksi,
   konfirmasi unit ter-scan, tambah ke keranjang tanpa pindah halaman.
6. **Status peminjaman visual** — timeline/stepper untuk perjalanan status
   (menunggu → dipinjam → dikembalikan) supaya siswa langsung paham posisinya.

### Deliverable yang aku harapkan
- Konsep desain mobile untuk **halaman-halaman kunci** di atas (Dashboard,
  Katalog, Buat Peminjaman + Scan QR, Peminjaman Saya + Detail, Profil, dan sisi
  admin: Verifikasi, Kelola Alat, Laporan).
- **Dua varian visual**: tema Siswa (friendly dark) & tema Admin (HUD).
- **Design system**: palet warna (pakai token yang sudah ada + usulan tambahan),
  tipografi, radius/spacing, komponen (kartu, badge status, bottom-sheet, tab
  bar, tombol, input, skeleton, empty state), dan daftar mikro-interaksi.
- Buat dalam bentuk yang bisa aku implementasikan dengan **Tailwind CSS 4** —
  sertakan contoh kelas/utility & struktur komponen bila memungkinkan.
- Bila memungkinkan, buat **prototipe HTML/React interaktif** yang bisa aku lihat
  langsung di layar HP.

Mulai dengan ringkasan arah desain (design direction) singkat untuk kedua tema,
lalu tunjukkan konsep per-halaman. Semua label & teks tetap **Bahasa Indonesia**.

---

## 🇬🇧 ENGLISH VERSION

You are a senior product & UI/UX designer specialized in mobile-first web apps. I
have a web application called **Inventaris TKJ** and I want you to **redesign its
mobile version** so it looks far more attractive, modern, non-monotonous, and
feels interactive to users — without changing the core flows/features.

### About the app
A **lab equipment borrowing management** app for a vocational school's Computer &
Network Engineering (TKJ) lab. Students borrow lab tools by scanning QR codes;
admins verify requests and manage inventory. **All UI text is in Indonesian.**

**Tech stack (must be respected in the design):**
- Next.js 16 (App Router) + React 19
- Tailwind CSS 4 + Radix UI (use Tailwind utilities & headless component patterns)
- PWA — installable to home screen (`standalone`, `portrait`)
- Dark theme by default

### Two user roles (two design "flavors")
1. **Student (borrower)** — "original" dark theme: black background `#000000`,
   blue `#0070f3` → purple `#7928ca` gradient accent, cards `#111111` with
   `#1f1f1f` borders, existing `.glass-card` and `.gradient-text` utilities.
   Priority: friendly, easy, fast, enjoyable for teenage students.
2. **Admin** — **"HUD / Transformers" theme**: futuristic, chamfered corners
   (angled clip-path), thin neon blue-purple lines, Orbitron/Rajdhani fonts,
   semi-transparent panels, lift-on-hover (`translateY`). Priority: information-
   dense, decisive, feels like a "command center".

> Keep these **two distinct visual identities**. Student = friendly & playful,
> Admin = HUD command-center. Do NOT merge them into one look.

### Existing mobile navigation (keep & refine)
- Top **App Bar**: per-page title, back button on sub-pages, menu button (admin)
  / notification bell.
- **Bottom Navigation** (4 tabs): **Dashboard**, **Tool Catalog**, **Borrowing**,
  **Profile**.

### Pages & features to design (mobile)
**General / Student:**
- **Dashboard** — stat cards, activity chart, admin note banner, login
  notification popup, booking mode toggle.
- **Tool Catalog** — list of tool types (name, category, location), stock badge,
  tool detail, QR-coded physical units.
- **Create Borrowing** — pick tool/unit, **QR camera scan**, cart, submit.
- **My Borrowings** — transaction list + status: `awaiting verification` →
  `borrowed` → `returned` / `cancelled`. Colored status badges. Archive.
- **Borrowing Detail** — borrowed units, admin notes, actions.
- **Profile** — personal data, settings, sign out.

**Admin only:**
- **Verify borrowings** (approve/reject), **scan returns**.
- **Manage Tools/Units** — add, edit, Excel import, print **QR labels**.
- **Lab Inventory** — lab census (Excel import/export), separate from borrowable
  units.
- **Reports** — Excel export.
- **Manage Users** — list, add, edit, detail (admin/student roles).

### What I want you to improve (core of the request)
1. **No monotony** — kill the stiff "flat lists everywhere" feel. Add visual
   hierarchy, lively cards, meaningful icons, friendly illustrations/empty states,
   and layout variety between pages.
2. **Interactive** — micro-interactions & smooth animation: page transitions, tap
   feedback, skeleton loading, pull-to-refresh, swipeable borrowing cards (e.g.
   swipe for quick actions), success animation on successful QR scan, animated
   status badges, haptic-like visual feedback.
3. **Truly mobile-first** — thumb-friendly targets (≥44px), bottom-sheets for
   actions/details (not desktop modals), sticky action buttons, safe-area aware
   (notch & home indicator), one-hand reachability.
4. **Clear states** — explicitly design loading (skeleton), empty (illustrative
   empty state), error, and success. Not just the happy path.
5. **Smooth QR scan flow** — camera screen, framing guidance, detection
   animation, scanned-unit confirmation, add-to-cart without leaving the page.
6. **Visual borrowing status** — a timeline/stepper for the status journey
   (awaiting → borrowed → returned) so students instantly grasp where they are.

### Expected deliverables
- Mobile design concepts for the **key pages** above (Dashboard, Catalog, Create
  Borrowing + QR Scan, My Borrowings + Detail, Profile, and admin side: Verify,
  Manage Tools, Reports).
- **Two visual variants**: Student theme (friendly dark) & Admin theme (HUD).
- **Design system**: color palette (reuse existing tokens + propose additions),
  typography, radius/spacing, components (cards, status badges, bottom-sheet, tab
  bar, buttons, inputs, skeletons, empty states), and a micro-interaction list.
- Deliver it in a form I can implement with **Tailwind CSS 4** — include example
  classes/utilities & component structure where possible.
- If possible, produce an **interactive HTML/React prototype** I can preview
  directly on a phone screen.

Start with a short design direction summary for both themes, then show per-page
concepts. Keep all labels & copy in **Indonesian**.

---

### Tips pemakaian
- Untuk hasil paling optimal di tool desain, **versi English sering lebih akurat**,
  tapi minta output copy/label tetap Bahasa Indonesia (sudah diminta di prompt).
- Kalau mau fokus dulu, jalankan bertahap: minta **Dashboard siswa** dulu, lalu
  **alur Scan QR**, baru **panel admin**.
- Lampirkan screenshot halaman aslimu ke tool desain agar redesign-nya nyambung.
