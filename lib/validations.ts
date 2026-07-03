import { z } from 'zod'

// Field kosong dari form ('' atau null) berarti "kosongkan" -> disimpan sebagai null,
// supaya saat edit nilai bisa dihapus. Saat create, null = tanpa nilai.

// URL foto: hanya boleh https (cegah javascript:/data: dan campuran konten).
const fotoUrl = z.preprocess(
  (v) => (v === '' || v == null ? null : v),
  z.string().url('URL foto tidak valid').startsWith('https://', 'URL foto harus diawali https://').max(2000).nullable(),
)

// Tanggal opsional: kosong -> null, sisanya di-coerce ke Date.
const optionalDate = z.preprocess(
  (v) => (v === '' || v == null ? null : v),
  z.coerce.date().nullable(),
)

const optionalText = (max: number) =>
  z.preprocess((v) => (v === '' || v == null ? null : v), z.string().max(max).nullable())

// Field inti alat (jenis). Sejak Plan B, alat tidak lagi punya kode/stok —
// itu pindah ke tabel Unit. Alat sekarang murni mewakili jenis (misal
// "Router Mikrotik RB951") dan stok dihitung dari unit yang terkait.
const alatBase = {
  nama: z.string().trim().min(1, 'Nama wajib diisi').max(200),
  kategori: z.string().trim().min(1, 'Kategori wajib diisi').max(100),
  lokasi: z.string().trim().max(200).optional(),
  deskripsi: optionalText(2000),
  foto: fotoUrl,
  tanggalEos: optionalDate,
  tanggalEol: optionalDate,
  keteranganEos: optionalText(500),
  keteranganEol: optionalText(500),
}

// Create: nama/kategori wajib. `.strict()` menolak field tak dikenal (mass assignment).
export const alatCreateSchema = z.object(alatBase).strict()

// Update: semua opsional, tetap `.strict()` agar field di luar daftar ditolak.
export const alatUpdateSchema = z.object(alatBase).partial().strict()

// ============================================================================
// Skema Unit (unit fisik per alat)
// Kode unik per unit, kondisi enum (baik/rusak). `.strict()` mencegah field liar.
// ============================================================================

const kondisiRule = z.enum(['baik', 'rusak'])

const unitBase = {
  kode: z.string().trim().min(1, 'Kode unit wajib diisi').max(50),
  alatId: z.coerce.number().int().positive('alatId tidak valid'),
  kondisi: kondisiRule,
  catatan: optionalText(500),
}

export const unitCreateSchema = z
  .object({ ...unitBase, kondisi: unitBase.kondisi.default('baik') })
  .strict()

// Update: tanpa alatId (unit tidak boleh pindah alat lewat update biasa).
export const unitUpdateSchema = z
  .object({
    kode: unitBase.kode,
    kondisi: unitBase.kondisi,
    catatan: unitBase.catatan,
  })
  .partial()
  .strict()

// Bulk update kondisi: maks 100 unit sekaligus.
export const unitBulkUpdateSchema = z
  .object({
    ids: z.array(z.number().int().positive()).min(1).max(100),
    kondisi: kondisiRule,
  })
  .strict()

// ============================================================================
// Skema user (dipakai oleh route admin /api/users)
// Memberlakukan kebijakan password yang sama dengan /api/register: min 8, max 72
// (bcrypt memotong di 72 byte). `.strict()` mencegah mass-assignment.
// ============================================================================

const passwordRule = z.string().min(8, 'Password minimal 8 karakter').max(72)
const roleRule = z.enum(['admin', 'siswa'])
const nullableStr = (max: number) =>
  z.preprocess((v) => (v === '' || v == null ? null : v), z.string().max(max).nullable())

export const userCreateSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z.string().email().max(200).transform((v) => v.toLowerCase()),
    password: passwordRule,
    role: roleRule.default('siswa'),
    kelas: nullableStr(50).optional(),
    kelompok: nullableStr(100).optional(),
  })
  .strict()

export const userUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z.string().email().max(200).transform((v) => v.toLowerCase()),
    password: passwordRule, // opsional via .partial() di bawah
    role: roleRule,
    kelas: nullableStr(50),
    kelompok: nullableStr(100),
  })
  .partial()
  .strict()

// ============================================================================
// Skema profil (dipakai oleh /api/profil PATCH milik user sendiri)
// Membatasi panjang nama kelompok dan jumlah/panjang anggota agar tidak bisa
// menyimpan blob besar (storage/DoS).
// ============================================================================
export const profilUpdateSchema = z
  .object({
    kelompok: nullableStr(100).optional(),
    anggotaKelompok: z.array(z.string().max(100)).max(50).optional(),
  })
  .strict()
