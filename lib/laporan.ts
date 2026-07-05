// Helper bersama halaman /laporan dan endpoint export Excel-nya:
// parsing + validasi filter, dan definisi "telat" yang konsisten.

export const LAPORAN_STATUS = ['menunggu_verifikasi', 'dipinjam', 'dikembalikan', 'dibatalkan'] as const
export type LaporanStatus = (typeof LAPORAN_STATUS)[number]

export interface LaporanFilter {
  status: LaporanStatus | ''
  dari?: Date
  sampai?: Date
  // Rentang tanggal saja — dipakai kartu statistik agar breakdown per status
  // tetap terlihat walau salah satu status sedang difilter.
  whereRange: { tanggalPinjam?: { gte?: Date; lte?: Date } }
  // Rentang + status — dipakai tabel, rekap, dan export.
  whereFull: { tanggalPinjam?: { gte?: Date; lte?: Date }; status?: string }
}

function parseTanggal(s: string | undefined | null, akhirHari = false): Date | undefined {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined
  const d = new Date(akhirHari ? `${s}T23:59:59` : s)
  return Number.isNaN(d.getTime()) ? undefined : d
}

export function parseLaporanFilter(sp: { status?: string | null; dari?: string | null; sampai?: string | null }): LaporanFilter {
  const status = (LAPORAN_STATUS as readonly string[]).includes(sp.status ?? '')
    ? (sp.status as LaporanStatus)
    : ''
  const dari = parseTanggal(sp.dari)
  const sampai = parseTanggal(sp.sampai, true)

  const whereRange =
    dari || sampai
      ? { tanggalPinjam: { ...(dari ? { gte: dari } : {}), ...(sampai ? { lte: sampai } : {}) } }
      : {}

  return {
    status,
    dari,
    sampai,
    whereRange,
    whereFull: { ...whereRange, ...(status ? { status } : {}) },
  }
}

// Telat = dikembalikan melewati batas, ATAU masih dipinjam padahal batas lewat.
export function isTelat(
  p: { status: string; tanggalBatasKembali: Date | null; tanggalKembali: Date | null },
  now = new Date(),
): boolean {
  if (!p.tanggalBatasKembali) return false
  if (p.status === 'dikembalikan') {
    return p.tanggalKembali !== null && p.tanggalKembali > p.tanggalBatasKembali
  }
  if (p.status === 'dipinjam') return p.tanggalBatasKembali < now
  return false
}
