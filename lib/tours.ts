// Konfigurasi tur panduan. Tiap key = "tourKey" yang disimpan status-nya di
// localStorage (tour-done:<key>). `element` = selector data-tour di halaman;
// step tanpa element ditampilkan sebagai kotak di tengah (intro).
//
// Fase 1: fokus SISWA (mobile). Admin & per-halaman lain menyusul.

export interface TourStep {
  element?: string
  title: string
  text: string
}

export const TOURS: Record<string, TourStep[]> = {
  // Onboarding — dijalankan sekali di Dashboard, mengenalkan navigasi.
  'siswa.onboarding': [
    {
      title: 'Selamat datang! 👋',
      text: 'Panduan singkat mengenal aplikasi peminjaman alat lab. Tekan Lanjut.',
    },
    { element: '[data-tour="nav-dashboard"]', title: 'Beranda', text: 'Ringkasan aktivitas dan statistik peminjamanmu ada di sini.' },
    { element: '[data-tour="nav-alat"]', title: 'Alat', text: 'Lihat katalog alat lab beserta jumlah yang tersedia.' },
    { element: '[data-tour="fab"]', title: 'Ajukan Peminjaman', text: 'Tombol tengah ini untuk mengajukan peminjaman — bisa scan QR atau pilih alat.' },
    { element: '[data-tour="nav-peminjaman"]', title: 'Pinjam', text: 'Pantau status pengajuanmu: menunggu, dipinjam, atau sudah dikembalikan.' },
    { element: '[data-tour="nav-profil"]', title: 'Profil', text: 'Kelola akun & kelompokmu, dan tombol keluar ada di sini.' },
    { element: '[data-tour="help"]', title: 'Butuh panduan lagi?', text: 'Tekan ikon tanda tanya ini kapan saja untuk memutar panduan lagi.' },
  ],

  // Halaman Alat (katalog).
  'siswa.alat': [
    { element: '[data-tour="alat-search"]', title: 'Cari Alat', text: 'Ketik nama alat untuk mencarinya dengan cepat.' },
    { element: '[data-tour="alat-kategori"]', title: 'Filter Kategori', text: 'Saring daftar alat berdasarkan kategori.' },
    { element: '[data-tour="alat-list"]', title: 'Daftar Alat', text: 'Ketuk salah satu alat untuk melihat detail & jumlah tersedia, lalu ajukan pinjam.' },
  ],

  // Halaman Buat Peminjaman.
  'siswa.baru': [
    { element: '[data-tour="baru-tambah"]', title: 'Tambah Alat', text: 'Cari alat yang mau dipinjam dengan mengetik namanya di sini.' },
    { element: '[data-tour="baru-scan"]', title: 'Scan QR', text: 'Atau scan QR pada alat untuk menambahkannya langsung ke daftar.' },
    { element: '[data-tour="baru-info"]', title: 'Info Peminjaman', text: 'Isi keperluan peminjaman. Batas kembali otomatis di hari yang sama.' },
    { element: '[data-tour="baru-submit"]', title: 'Ajukan', text: 'Kalau sudah lengkap, tekan tombol ini untuk mengirim pengajuan ke admin.' },
  ],

  // Halaman Peminjaman (daftar/status).
  'siswa.peminjaman': [
    { element: '[data-tour="pinjam-status"]', title: 'Filter Status', text: 'Saring peminjamanmu: menunggu, dipinjam, dikembalikan, atau dibatalkan.' },
    { element: '[data-tour="pinjam-list"]', title: 'Daftar Peminjaman', text: 'Ketuk kartu untuk melihat detail. Status akan terupdate otomatis saat admin memproses.' },
  ],

  // Halaman Profil.
  'siswa.profil': [
    { element: '[data-tour="profil-info"]', title: 'Data Akun', text: 'Info akunmu: nama, email, kelas, dan status.' },
    { element: '[data-tour="profil-kelompok"]', title: 'Kelompok', text: 'Atur nama kelompok & anggotanya di sini, lalu tekan simpan.' },
    { element: '[data-tour="profil-keluar"]', title: 'Keluar', text: 'Tekan ini untuk keluar dari akun di perangkat ini.' },
  ],

  // ============ ADMIN (mobile) ============
  'admin.onboarding': [
    { title: 'Selamat datang, Admin! 👋', text: 'Panduan singkat mengenal panel admin. Tekan Lanjut.' },
    { element: '[data-tour="menu"]', title: 'Menu Lengkap', text: 'Buka menu ini untuk akses Laporan, Inventaris Lab, dan Manajemen User.' },
    { element: '[data-tour="nav-dashboard"]', title: 'Beranda', text: 'Ringkasan & statistik: peminjaman aktif, menunggu verifikasi, dll.' },
    { element: '[data-tour="nav-alat"]', title: 'Kelola Alat', text: 'Kelola daftar alat, unit, stok, dan label QR.' },
    { element: '[data-tour="fab"]', title: 'Scan Pengembalian', text: 'Tombol tengah untuk scan QR saat siswa mengembalikan alat.' },
    { element: '[data-tour="nav-peminjaman"]', title: 'Peminjaman', text: 'Verifikasi, tolak, atau tandai pengembalian peminjaman siswa.' },
    { element: '[data-tour="nav-profil"]', title: 'Pengaturan', text: 'Pengaturan sistem: jam operasional, aturan, buka/tutup sesi.' },
    { element: '[data-tour="help"]', title: 'Butuh panduan lagi?', text: 'Tekan ikon "?" ini kapan saja untuk memutar panduan halaman.' },
    // Langkah desktop (hanya muncul di layar lebar — elemen mobile di atas tersembunyi).
    { element: '[data-tour="side-nav"]', title: 'Menu Navigasi', text: 'Di desktop, semua menu ada di sidebar kiri ini: Dashboard, Alat, Peminjaman, User, Laporan, Inventaris Lab.' },
    { element: '[data-tour="help-desktop"]', title: 'Panduan Halaman', text: 'Tekan tombol "Panduan" di kanan atas untuk memutar tur halaman kapan saja.' },
  ],

  'admin.alat': [
    { element: '[data-tour="alat-actions"]', title: 'Aksi Alat', text: 'Tambah alat baru, import massal dari Excel, atau cetak label QR.' },
    { element: '[data-tour="alat-search"]', title: 'Cari Alat', text: 'Cari alat dengan mengetik namanya.' },
    { element: '[data-tour="alat-kategori"]', title: 'Filter Kategori', text: 'Saring alat berdasarkan kategori.' },
    { element: '[data-tour="alat-list"]', title: 'Daftar Alat', text: 'Ketuk alat untuk lihat/kelola unit & stoknya.' },
  ],

  'admin.peminjaman': [
    { element: '[data-tour="admin-pinjam-status"]', title: 'Filter Status', text: 'Saring pengajuan: menunggu, dipinjam, dikembalikan, dibatalkan (dengan jumlahnya).' },
    { element: '[data-tour="admin-pinjam-kelas"]', title: 'Filter Kelas', text: 'Persempit berdasarkan tingkat kelas.' },
    { element: '[data-tour="admin-pinjam-list"]', title: 'Kelola Peminjaman', text: 'Ketuk kartu untuk menyetujui, menolak, atau menandai pengembalian.' },
    // Desktop.
    { element: '[data-tour="pinjam-status-d"]', title: 'Filter Status', text: 'Saring pengajuan berdasarkan status.' },
    { element: '[data-tour="pinjam-table-d"]', title: 'Tabel Peminjaman', text: 'Semua peminjaman tampil di tabel; kelola verifikasi & pengembalian dari sini.' },
  ],

  'admin.laporan': [
    { element: '[data-tour="laporan-export"]', title: 'Export Excel', text: 'Unduh laporan sesuai filter ke file Excel.' },
    { element: '[data-tour="laporan-filter"]', title: 'Filter', text: 'Saring laporan berdasarkan status dan rentang tanggal.' },
    { element: '[data-tour="laporan-stats"]', title: 'Ringkasan', text: 'Statistik peminjaman mengikuti filter yang dipilih.' },
  ],

  'admin.users': [
    { element: '[data-tour="users-actions"]', title: 'Aksi User', text: 'Import akun siswa massal dari Excel, atau tambah user satu per satu.' },
    { element: '[data-tour="users-search"]', title: 'Cari User', text: 'Cari berdasarkan nama, email, atau kelas.' },
    { element: '[data-tour="users-list"]', title: 'Daftar User', text: 'Detail, edit, atau nonaktifkan akun siswa dari sini.' },
    { element: '[data-tour="users-table"]', title: 'Tabel User', text: 'Di desktop, daftar user tampil sebagai tabel dengan aksi Detail / Edit / Nonaktifkan.' },
  ],

  'admin.inventaris': [
    { element: '[data-tour="lab-actions"]', title: 'Export / Import', text: 'Unduh atau ganti data inventaris lab lewat file Excel.' },
    { element: '[data-tour="lab-sheets"]', title: 'Pilih Lab', text: 'Ketuk tab untuk berpindah antar lab (sheet).' },
  ],

  'admin.pengaturan': [
    { element: '[data-tour="pengaturan-booking"]', title: 'Sesi Peminjaman', text: 'Buka atau tutup pengajuan peminjaman siswa.' },
    { element: '[data-tour="pengaturan-form"]', title: 'Pengaturan Sistem', text: 'Atur jam operasional, batas unit/hari, verifikasi otomatis, dll.' },
  ],
}

// Tentukan tur mana untuk rute + peran tertentu.
// role di-trim karena sebagian data lama punya spasi/tab nyasar (mis. "siswa\t").
export function tourKeyFor(pathname: string, role?: string): string | null {
  const r = (role ?? '').trim()

  if (r === 'admin') {
    if (pathname === '/dashboard') return 'admin.onboarding'
    if (pathname === '/alat') return 'admin.alat'
    if (pathname === '/peminjaman') return 'admin.peminjaman'
    if (pathname === '/laporan') return 'admin.laporan'
    if (pathname === '/users') return 'admin.users'
    if (pathname === '/inventaris-lab') return 'admin.inventaris'
    if (pathname === '/profil') return 'admin.pengaturan'
    return null
  }

  if (r === 'siswa') {
    if (pathname === '/dashboard') return 'siswa.onboarding'
    if (pathname === '/alat') return 'siswa.alat'
    if (pathname === '/peminjaman/baru') return 'siswa.baru'
    if (pathname === '/peminjaman') return 'siswa.peminjaman'
    if (pathname === '/profil') return 'siswa.profil'
    return null
  }

  return null
}
