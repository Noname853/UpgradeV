import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { NextRequest, NextResponse } from 'next/server'
import { unitUpdateSchema } from '@/lib/validations'
import { isSameOrigin } from '@/lib/csrf'

const AKTIF = ['menunggu_verifikasi', 'dipinjam']

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const session = await auth()
  if (!session || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const numId = Number(id)
  if (!Number.isInteger(numId) || numId <= 0)
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })

  try {
    const parsed = unitUpdateSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })
    }

    // Kalau kode diubah, pastikan tidak konflik.
    if (parsed.data.kode) {
      const dup = await prisma.unit.findFirst({
        where: { kode: parsed.data.kode, NOT: { id: numId } },
        select: { id: true },
      })
      if (dup) return NextResponse.json({ error: 'Kode unit sudah digunakan' }, { status: 400 })
    }

    const unit = await prisma.unit.update({
      where: { id: numId },
      data: parsed.data,
    })
    return NextResponse.json(unit)
  } catch (err) {
    logger.error({ err }, '[PATCH /api/units/[id]]')
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const session = await auth()
  if (!session || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const numId = Number(id)
  if (!Number.isInteger(numId) || numId <= 0)
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })

  try {
    // Unit tidak bisa dihapus selama masih dipinjam aktif.
    const active = await prisma.peminjamanDetail.count({
      where: {
        unitId: numId,
        peminjaman: { status: { in: AKTIF } },
      },
    })
    if (active > 0) {
      return NextResponse.json({ error: 'Unit sedang dipinjam, tidak bisa dihapus' }, { status: 400 })
    }

    // Cek riwayat — kalau pernah dipinjam, tolak (preserve audit trail).
    const ever = await prisma.peminjamanDetail.count({ where: { unitId: numId } })
    if (ever > 0) {
      return NextResponse.json(
        { error: 'Unit pernah dipakai dalam peminjaman, tidak bisa dihapus (untuk preservasi histori). Tandai sebagai "rusak" jika sudah tidak terpakai.' },
        { status: 400 },
      )
    }

    await prisma.unit.delete({ where: { id: numId } })
    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error({ err }, '[DELETE /api/units/[id]]')
    return NextResponse.json({ error: 'Gagal menghapus unit' }, { status: 500 })
  }
}
