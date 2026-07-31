import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { isSameOrigin } from '@/lib/csrf'
import { getPengaturan, setPengaturan, dalamJamOperasional } from '@/lib/pengaturan'
import { z } from 'zod'

// Setelan sistem. `bookingDibuka` (gabungan saklar admin + jam operasional)
// dipakai siswa untuk tahu apakah boleh mengajukan lewat "pilih dari daftar".
// Field mentah (jamBuka/jamTutup/dst) dipakai form Pengaturan admin & label.
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const p = await getPengaturan()
    const jamOperasional = dalamJamOperasional(new Date(), p.jamBuka, p.jamTutup)
    return NextResponse.json({
      bookingDibuka: p.bookingDibuka && jamOperasional,
      dalamJamOperasional: jamOperasional,
      bookingManual: p.bookingDibuka,
      jamBuka: p.jamBuka,
      jamTutup: p.jamTutup,
      maxUnitSiswa: p.maxUnitSiswa,
      maxHari: p.maxHari,
      verifikasiOtomatis: p.verifikasiOtomatis,
      peringatanKeterlambatan: p.peringatanKeterlambatan,
      bolehMultiUnit: p.bolehMultiUnit,
    })
  } catch (err) {
    logger.error({ err }, '[GET /api/pengaturan]')
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

const patchSchema = z
  .object({
    bookingDibuka: z.boolean().optional(),
    jamBuka: z.number().int().min(0).max(23).optional(),
    jamTutup: z.number().int().min(1).max(24).optional(),
    maxUnitSiswa: z.number().int().min(1).max(50).optional(),
    maxHari: z.number().int().min(1).max(30).optional(),
    verifikasiOtomatis: z.boolean().optional(),
    peringatanKeterlambatan: z.boolean().optional(),
    bolehMultiUnit: z.boolean().optional(),
  })
  .strict()

// Ubah setelan. Khusus admin.
export async function PATCH(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const session = await auth()
  if (!session || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })

  // Validasi silang: jam tutup harus lebih besar dari jam buka.
  const saatIni = await getPengaturan()
  const jamBuka = parsed.data.jamBuka ?? saatIni.jamBuka
  const jamTutup = parsed.data.jamTutup ?? saatIni.jamTutup
  if (jamTutup <= jamBuka) {
    return NextResponse.json({ error: 'Jam tutup harus lebih besar dari jam buka' }, { status: 400 })
  }

  try {
    await setPengaturan(parsed.data, parseInt(session.user.id))
    const p = await getPengaturan()
    const jamOperasional = dalamJamOperasional(new Date(), p.jamBuka, p.jamTutup)
    return NextResponse.json({
      bookingDibuka: p.bookingDibuka,
      jamBuka: p.jamBuka,
      jamTutup: p.jamTutup,
      maxUnitSiswa: p.maxUnitSiswa,
      maxHari: p.maxHari,
      verifikasiOtomatis: p.verifikasiOtomatis,
      peringatanKeterlambatan: p.peringatanKeterlambatan,
      bolehMultiUnit: p.bolehMultiUnit,
      dalamJamOperasional: jamOperasional,
    })
  } catch (err) {
    logger.error({ err }, '[PATCH /api/pengaturan]')
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
