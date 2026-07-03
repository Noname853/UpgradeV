import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { isSameOrigin } from '@/lib/csrf'
import { peminjamanReturnSchema } from '@/lib/validations'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const session = await auth()
  if (!session || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const numId = Number(id)
  if (!Number.isInteger(numId) || numId <= 0)
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })

  const parsed = peminjamanReturnSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })
  const { catatan, kerusakan } = parsed.data

  try {
    const peminjaman = await prisma.peminjaman.findUnique({
      where: { id: numId },
      include: { details: { select: { unitId: true } } },
    })

    if (!peminjaman) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (peminjaman.status !== 'dipinjam')
      return NextResponse.json({ error: 'Status tidak valid untuk pengembalian' }, { status: 400 })

    // Hanya proses unit yang benar-benar bagian dari peminjaman ini.
    const validUnitIds = new Set(peminjaman.details.map((d) => d.unitId))
    const rusak = (kerusakan ?? []).filter((k) => validUnitIds.has(k.unitId))

    const updated = await prisma.$transaction(async (tx) => {
      for (const { unitId, catatan: catatanRusak } of rusak) {
        const note = catatanRusak && catatanRusak.length > 0 ? catatanRusak : null
        // Catat kerusakan pada baris peminjaman (menghubungkan kerusakan -> peminjam).
        await tx.peminjamanDetail.updateMany({
          where: { peminjamanId: numId, unitId },
          data: { kerusakan: note ?? 'Rusak' },
        })
        // Ubah kondisi unit fisik menjadi rusak.
        await tx.unit.update({
          where: { id: unitId },
          data: { kondisi: 'rusak', catatan: note },
        })
      }

      return tx.peminjaman.update({
        where: { id: numId },
        data: {
          status: 'dikembalikan',
          tanggalKembali: new Date(),
          returnedBy: parseInt(session.user.id),
          catatanPengembalian: catatan ?? null,
        },
      })
    })

    return NextResponse.json(updated)
  } catch (err) {
    logger.error({ err }, '[PATCH /api/peminjaman/[id]/return]')
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
