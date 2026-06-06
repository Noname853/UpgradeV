import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const numId = Number(id)
  if (!Number.isInteger(numId) || numId <= 0)
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })

  try {
    const body = await req.json()
    const { name, email, role, kelas, kelompok, password } = body

    if (role !== undefined && role !== 'admin' && role !== 'siswa') {
      return NextResponse.json({ error: 'Role tidak valid' }, { status: 400 })
    }

    const data: Record<string, unknown> = { name, email, role, kelas, kelompok }
    if (password) data.password = await bcrypt.hash(password, 10)

    const user = await prisma.user.update({
      where: { id: numId },
      data,
      select: { id: true, name: true, email: true, role: true, kelas: true },
    })
    return NextResponse.json(user)
  } catch (err) {
    console.error('[PUT /api/users/[id]]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const numId = Number(id)
  if (!Number.isInteger(numId) || numId <= 0)
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })

  if (numId === parseInt(session.user.id))
    return NextResponse.json({ error: 'Tidak bisa menonaktifkan akun sendiri' }, { status: 400 })

  try {
    const user = await prisma.user.findUnique({ where: { id: numId }, select: { isActive: true } })
    if (!user) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })

    if (user.isActive) {
      const aktif = await prisma.peminjaman.count({
        where: { userId: numId, status: { in: ['menunggu_verifikasi', 'dipinjam'] } },
      })
      if (aktif > 0)
        return NextResponse.json(
          { error: `User masih memiliki ${aktif} peminjaman aktif. Selesaikan atau batalkan dulu.` },
          { status: 400 }
        )
    }

    const updated = await prisma.user.update({
      where: { id: numId },
      data: { isActive: !user.isActive },
      select: { id: true, isActive: true },
    })
    return NextResponse.json(updated)
  } catch (err) {
    console.error('[PATCH /api/users/[id]]', err)
    return NextResponse.json({ error: 'Gagal mengubah status user' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const numId = Number(id)
  if (!Number.isInteger(numId) || numId <= 0)
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })

  if (numId === parseInt(session.user.id))
    return NextResponse.json({ error: 'Tidak bisa menghapus akun sendiri' }, { status: 400 })

  try {
    const user = await prisma.user.findUnique({ where: { id: numId }, select: { isActive: true } })
    if (!user) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
    if (user.isActive)
      return NextResponse.json({ error: 'Nonaktifkan user terlebih dahulu sebelum menghapus permanen' }, { status: 400 })

    const userId = numId

    await prisma.$transaction(async (tx) => {
      await tx.peminjaman.updateMany({ where: { verifiedBy: userId }, data: { verifiedBy: null } })
      await tx.peminjaman.updateMany({ where: { returnedBy: userId }, data: { returnedBy: null } })
      await tx.peminjaman.updateMany({ where: { cancelledBy: userId }, data: { cancelledBy: null } })
      await tx.peminjamanDetail.deleteMany({ where: { peminjaman: { userId } } })
      await tx.peminjaman.deleteMany({ where: { userId } })
      await tx.user.delete({ where: { id: userId } })
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/users/[id]]', err)
    return NextResponse.json({ error: 'Gagal menghapus user' }, { status: 500 })
  }
}
