import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { NextRequest, NextResponse } from 'next/server'
import { unitBulkUpdateSchema } from '@/lib/validations'
import { isSameOrigin } from '@/lib/csrf'

const AKTIF = ['menunggu_verifikasi', 'dipinjam']

export async function PATCH(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const session = await auth()
  if (!session || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const parsed = unitBulkUpdateSchema.safeParse(await req.json())
    if (!parsed.success)
      return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })

    const { ids, kondisi } = parsed.data

    // Skip unit yang sedang dipinjam aktif — jangan error, cukup lewati.
    const aktifIds = await prisma.peminjamanDetail.findMany({
      where: { unitId: { in: ids }, peminjaman: { status: { in: AKTIF } } },
      select: { unitId: true },
    })
    const skipIds = new Set(aktifIds.map((d) => d.unitId))
    const updateIds = ids.filter((id) => !skipIds.has(id))

    if (updateIds.length === 0)
      return NextResponse.json({ error: 'Semua unit yang dipilih sedang dipinjam' }, { status: 400 })

    const result = await prisma.unit.updateMany({
      where: { id: { in: updateIds } },
      // Kembali "baik" = kerusakan selesai: bersihkan juga catatan kerusakan
      // (konsisten dengan toggle per-unit di UnitManager).
      data: kondisi === 'baik' ? { kondisi, catatan: null } : { kondisi },
    })

    return NextResponse.json({ updated: result.count, skipped: skipIds.size })
  } catch (err) {
    logger.error({ err }, '[PATCH /api/units/bulk]')
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
