import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const JAM_BUKA = 6 // 06:00 WIB
export const JAM_TUTUP = 17 // 17:00 WIB

// Jam operasional lab, dicek server-side (bukan cuma UI seperti versi lama).
// Dipakai BARENG saklar admin: pengajuan pilih-dari-daftar butuh keduanya —
// saklar terbuka DAN sedang dalam jam ini. Scan QR tetap terkecuali (lihat
// bolehAjukan) karena sudah membuktikan kehadiran fisik di lab.
export function dalamJamOperasional(now: Date = new Date()): boolean {
  const jam = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Jakarta',
      hour: 'numeric',
      hourCycle: 'h23',
    }).format(now),
  )
  return jam >= JAM_BUKA && jam < JAM_TUTUP
}

// Setelan disimpan sebagai baris tunggal. Bila belum ada baris (fresh DB),
// default aman = booking terbuka. Query dibungkus try/catch agar tabel yang
// belum sempat dibuat (mis. sesaat setelah deploy sebelum startup-migrations
// jalan) tidak menjatuhkan halaman yang memakainya — cukup default terbuka.
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

// Aturan gate (fungsi murni agar mudah diuji): saat booking ditutup, pengajuan
// hanya boleh bila SEMUA unit berasal dari scan QR. Metode "pilih dari daftar"
// (viaScan=false) diblokir. Saat terbuka, apa pun boleh.
export function bolehAjukan(bookingDibuka: boolean, items: { viaScan: boolean }[]): boolean {
  if (bookingDibuka) return true
  return items.every((it) => it.viaScan)
}
