import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { isSameOrigin } from '@/lib/csrf'
import { labItemCreateSchema } from '@/lib/lab-inventaris'
import { NextRequest, NextResponse } from 'next/server'

// Tambah barang ke salah satu sheet inventaris lab. Khusus admin.
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const session = await auth()
  if (!session || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const parsed = labItemCreateSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Data tidak valid' },
        { status: 400 },
      )
    }
    const { sheetId, ...data } = parsed.data

    const sheet = await prisma.labSheet.findUnique({ where: { id: sheetId }, select: { id: true } })
    if (!sheet) return NextResponse.json({ error: 'Sheet tidak ditemukan' }, { status: 404 })

    const last = await prisma.labItem.aggregate({ where: { sheetId }, _max: { urutan: true } })
    const item = await prisma.labItem.create({
      data: { ...data, sheetId, urutan: (last._max.urutan ?? 0) + 1 },
    })
    return NextResponse.json({ data: item }, { status: 201 })
  } catch (err) {
    logger.error({ err }, '[POST /api/lab-inventaris]')
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
