export type UserRole = 'admin' | 'siswa'

export interface UserSafe {
  id: number
  name: string
  email: string
  role: string
  kelas: string | null
  kelompok: string | null
  createdAt: Date | string
}

export interface AlatWithStock {
  id: number
  kode: string
  nama: string
  kategori: string
  stok: number
  stokTersedia: number
  lokasi: string
  deskripsi: string | null
  foto: string | null
  tanggalEos: Date | string | null
  tanggalEol: Date | string | null
  keteranganEos: string | null
  keteranganEol: string | null
  createdAt: Date | string
}

export interface PeminjamanDetail {
  id: number
  alatId: number
  jumlah: number
  keterangan: string | null
  alat: {
    id: number
    nama: string
    kode: string
    kategori: string
  }
}

export interface PeminjamanWithDetails {
  id: number
  userId: number
  totalItems: number
  status: string
  tanggalPinjam: Date | string
  tanggalBatasKembali: Date | string | null
  tanggalKembali: Date | string | null
  tanggalVerifikasi: Date | string | null
  keperluan: string
  catatan: string | null
  alasanPembatalan: string | null
  createdAt: Date | string
  user: {
    id: number
    name: string
    email: string
    kelas: string | null
  }
  details: PeminjamanDetail[]
}

export interface DashboardStats {
  totalAlat: number
  totalUser: number
  peminjamanAktif: number
  menungguVerifikasi: number
  stokRendah: number
  dikembalikanBulanIni: number
}
