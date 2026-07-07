import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { isSameOrigin } from '@/lib/csrf'
import { labItemUpdateSchema } from '@/lib/lab-inventaris'
import { NextRequest, NextResponse } from 'next/server'

async function adminOnly(req: NextRequest) {
  if (!isSameOrigin(req)) return null
  const session = await auth()
  if (!session || session.user.role !== 'admin') return null
  return session
}

function parseId(id: string): number | null {
  const numId = Number(id)
  return Number.isInteger(numId) && numId > 0 ? numId : null
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await adminOnly(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const numId = parseId((await params).id)
  if (!numId) return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })

  try {
    const parsed = labItemUpdateSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Data tidak valid' },
        { status: 400 },
      )
    }
    const item = await prisma.labItem.update({ where: { id: numId }, data: parsed.data })
    return NextResponse.json({ data: item })
  } catch (err) {
    logger.error({ err }, '[PATCH /api/lab-inventaris/[id]]')
    return NextResponse.json({ error: 'Barang tidak ditemukan' }, { status: 404 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await adminOnly(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const numId = parseId((await params).id)
  if (!numId) return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })

  try {
    await prisma.labItem.delete({ where: { id: numId } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error({ err }, '[DELETE /api/lab-inventaris/[id]]')
    return NextResponse.json({ error: 'Barang tidak ditemukan' }, { status: 404 })
  }
}
