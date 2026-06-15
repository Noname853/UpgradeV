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

// Field inti alat. Dipakai POST (create) sebagai required, PUT (update) sebagai partial.
const alatBase = {
  kode: z.string().trim().min(1, 'Kode wajib diisi').max(50),
  nama: z.string().trim().min(1, 'Nama wajib diisi').max(200),
  kategori: z.string().trim().min(1, 'Kategori wajib diisi').max(100),
  stok: z.coerce.number().int('Stok harus bilangan bulat').min(0, 'Stok tidak boleh negatif').max(1_000_000),
  lokasi: z.string().trim().max(200).optional(),
  deskripsi: optionalText(2000),
  foto: fotoUrl,
  tanggalEos: optionalDate,
  tanggalEol: optionalDate,
  keteranganEos: optionalText(500),
  keteranganEol: optionalText(500),
}

// Create: kode/nama/kategori wajib; stok default 0. `.strict()` menolak field tak dikenal
// sehingga tidak bisa menyetel kolom sembarangan (mass assignment).
export const alatCreateSchema = z
  .object({ ...alatBase, stok: alatBase.stok.default(0) })
  .strict()

// Update: semua opsional, tetap `.strict()` agar field di luar daftar ditolak.
export const alatUpdateSchema = z
  .object(alatBase)
  .partial()
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
