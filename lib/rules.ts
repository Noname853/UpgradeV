// Sumber tunggal aturan lab/peminjaman. Dipakai di landing (app/page.tsx) dan
// di gerbang persetujuan halaman pendaftaran (app/(auth)/register/page.tsx).
export type Rule = {
  n: string
  title: string
  desc: string
  hex: string
  rgb: string
}

export const rules: Rule[] = [
  {
    n: '01',
    title: 'AJUKAN VIA SISTEM',
    desc: 'Login dengan akun siswa, lalu ajukan peminjaman melalui dashboard. Peminjaman manual tidak dilayani.',
    hex: '#5c84ff',
    rgb: '92,132,255',
  },
  {
    n: '02',
    title: 'TUNGGU VERIFIKASI',
    desc: 'Alat baru bisa diambil setelah pengajuan disetujui admin. Status persetujuan tampil real-time di akunmu.',
    hex: '#22d3ee',
    rgb: '34,211,238',
  },
  {
    n: '03',
    title: 'RAWAT ALAT',
    desc: 'Gunakan alat sesuai fungsinya dan jaga kebersihannya. Dilarang memindahtangankan ke siswa lain.',
    hex: '#2dd4a0',
    rgb: '45,212,160',
  },
  {
    n: '04',
    title: 'KEMBALIKAN TEPAT WAKTU',
    desc: 'Kembalikan alat sesuai jadwal dalam kondisi lengkap. Keterlambatan dapat membatasi peminjaman berikutnya.',
    hex: '#ffb43d',
    rgb: '245,166,35',
  },
  {
    n: '05',
    title: 'TANGGUNG JAWAB',
    desc: 'Kerusakan atau kehilangan menjadi tanggung jawab peminjam sesuai ketentuan penggantian yang berlaku.',
    hex: '#b07cff',
    rgb: '168,85,247',
  },
]
