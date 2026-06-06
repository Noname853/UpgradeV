import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

function parseAnggota(value: string | null): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: parseInt(session.user.id) },
    select: { id: true, name: true, email: true, kelas: true, kelompok: true, anggotaKelompok: true },
  })
  if (!user) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })

  return NextResponse.json({
    ...user,
    anggotaKelompok: parseAnggota(user.anggotaKelompok),
  })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { kelompok, anggotaKelompok } = await req.json()

    const user = await prisma.user.update({
      where: { id: parseInt(session.user.id) },
      data: {
        kelompok: kelompok?.trim() || null,
        anggotaKelompok: Array.isArray(anggotaKelompok) && anggotaKelompok.length > 0
          ? JSON.stringify(anggotaKelompok.map((n: string) => n.trim()).filter(Boolean))
          : null,
      },
      select: { id: true, kelompok: true, anggotaKelompok: true },
    })

    return NextResponse.json({
      ...user,
      anggotaKelompok: parseAnggota(user.anggotaKelompok),
    })
  } catch {
    return NextResponse.json({ error: 'Gagal menyimpan' }, { status: 500 })
  }
}
