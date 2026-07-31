import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const JAM_BUKA = 6 // 06:00 WIB (default)
export const JAM_TUTUP = 17 // 17:00 WIB (default)

export interface PengaturanData {
  bookingDibuka: boolean
  jamBuka: number
  jamTutup: number
  maxUnitSiswa: number
  maxHari: number
  verifikasiOtomatis: boolean
  peringatanKeterlambatan: boolean
  bolehMultiUnit: boolean
}

export const PENGATURAN_DEFAULT: PengaturanData = {
  bookingDibuka: true,
  jamBuka: JAM_BUKA,
  jamTutup: JAM_TUTUP,
  maxUnitSiswa: 3,
  maxHari: 1,
  verifikasiOtomatis: false,
  peringatanKeterlambatan: true,
  bolehMultiUnit: false,
}

// Jam operasional lab, dicek server-side. Jam buka/tutup kini bisa diatur admin
// (disimpan di DB); default 06:00-17:00 bila belum diubah. Fungsi ini murni agar
// mudah diuji — pemanggil melewatkan jam dari DB.
export function dalamJamOperasional(
  now: Date = new Date(),
  jamBuka: number = JAM_BUKA,
  jamTutup: number = JAM_TUTUP,
): boolean {
  const jam = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Jakarta',
      hour: 'numeric',
      hourCycle: 'h23',
    }).format(now),
  )
  return jam >= jamBuka && jam < jamTutup
}

// Baca seluruh setelan sistem (satu baris tunggal). Default aman bila baris/tabel
// belum ada (mis. fresh DB / sesaat setelah deploy).
export async function getPengaturan(): Promise<PengaturanData> {
  try {
    const row = await prisma.pengaturan.findFirst()
    if (!row) return { ...PENGATURAN_DEFAULT }
    return {
      bookingDibuka: row.bookingDibuka,
      jamBuka: row.jamBuka,
      jamTutup: row.jamTutup,
      maxUnitSiswa: row.maxUnitSiswa,
      maxHari: row.maxHari,
      verifikasiOtomatis: row.verifikasiOtomatis,
      peringatanKeterlambatan: row.peringatanKeterlambatan,
      bolehMultiUnit: row.bolehMultiUnit,
    }
  } catch (err) {
    logger.error({ err }, '[getPengaturan] gagal baca setelan, pakai default')
    return { ...PENGATURAN_DEFAULT }
  }
}

// Status buka/tutup booking saja (dipakai dashboard). Dibungkus try/catch agar
// tabel yang belum sempat dibuat tidak menjatuhkan halaman.
export async function getBookingDibuka(): Promise<boolean> {
  try {
    const row = await prisma.pengaturan.findFirst({ select: { bookingDibuka: true } })
    return row?.bookingDibuka ?? true
  } catch (err) {
    logger.error({ err }, '[getBookingDibuka] gagal baca setelan, default terbuka')
    return true
  }
}

// Set status buka/tutup. Upsert baris tunggal (buat bila belum ada).
export async function setBookingDibuka(dibuka: boolean, adminId: number) {
  const existing = await prisma.pengaturan.findFirst({ select: { id: true } })
  if (existing) {
    return prisma.pengaturan.update({
      where: { id: existing.id },
      data: { bookingDibuka: dibuka, diubahOleh: adminId },
    })
  }
  return prisma.pengaturan.create({
    data: { bookingDibuka: dibuka, diubahOleh: adminId },
  })
}

// Simpan sebagian/seluruh setelan. Upsert baris tunggal.
export async function setPengaturan(data: Partial<PengaturanData>, adminId: number) {
  const existing = await prisma.pengaturan.findFirst({ select: { id: true } })
  if (existing) {
    return prisma.pengaturan.update({
      where: { id: existing.id },
      data: { ...data, diubahOleh: adminId },
    })
  }
  return prisma.pengaturan.create({
    data: { ...PENGATURAN_DEFAULT, ...data, diubahOleh: adminId },
  })
}

// Aturan gate (fungsi murni agar mudah diuji): saat booking ditutup, pengajuan
// hanya boleh bila SEMUA unit berasal dari scan QR. Metode "pilih dari daftar"
// (viaScan=false) diblokir. Saat terbuka, apa pun boleh.
export function bolehAjukan(bookingDibuka: boolean, items: { viaScan: boolean }[]): boolean {
  if (bookingDibuka) return true
  return items.every((it) => it.viaScan)
}
