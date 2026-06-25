import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { alatUpdateSchema } from '@/lib/validations'
import { isSameOrigin } from '@/lib/csrf'

const AKTIF = ['menunggu_verifikasi', 'dipinjam']

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const numId = Number(id)
  if (!Number.isInteger(numId) || numId <= 0)
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })

  const alat = await prisma.alat.findUnique({
    where: { id: numId },
    include: {
      units: {
        orderBy: { kode: 'asc' },
        include: {
          peminjamanDetails: {
            where: { peminjaman: { status: { in: AKTIF } } },
            include: {
              peminjaman: {
                select: {
                  id: true,
                  status: true,
                  user: { select: { id: true, name: true, kelas: true } },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!alat) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let tersedia = 0, dipinjam = 0, rusak = 0
  const units = alat.units.map((u) => {
    const aktif = u.peminjamanDetails[0]
    const status: 'tersedia' | 'dipinjam' | 'rusak' =
      u.kondisi === 'rusak' ? 'rusak' : aktif ? 'dipinjam' : 'tersedia'
    if (status === 'tersedia') tersedia++
    else if (status === 'dipinjam') dipinjam++
    else rusak++
    return {
      id: u.id,
      kode: u.kode,
      kondisi: u.kondisi,
      catatan: u.catatan,
      status,
      peminjaman: aktif?.peminjaman ?? null,
    }
  })

  return NextResponse.json({
    id: alat.id,
    nama: alat.nama,
    kategori: alat.kategori,
    lokasi: alat.lokasi,
    deskripsi: alat.deskripsi,
    foto: alat.foto,
    tanggalEos: alat.tanggalEos,
    tanggalEol: alat.tanggalEol,
    keteranganEos: alat.keteranganEos,
    keteranganEol: alat.keteranganEol,
    createdAt: alat.createdAt,
    updatedAt: alat.updatedAt,
    units,
    totalUnit: units.length,
    tersedia,
    dipinjam,
    rusak,
  })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const session = await auth()
  if (!session || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const numId = Number(id)
  if (!Number.isInteger(numId) || numId <= 0)
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })

  try {
    const parsed = alatUpdateSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })
    }

    const alat = await prisma.alat.update({
      where: { id: numId },
      data: parsed.data,
    })
    return NextResponse.json(alat)
  } catch (err) {
    logger.error({ err }, '[PUT /api/alat/[id]]')
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
    // Alat tidak bisa dihapus selama masih punya Unit. Admin harus hapus
    // unit-nya satu-satu dulu (dan unit tidak bisa dihapus kalau sedang/pernah dipinjam).
    const unitCount = await prisma.unit.count({ where: { alatId: numId } })
    if (unitCount > 0) {
      return NextResponse.json(
        { error: `Alat masih punya ${unitCount} unit. Hapus unit-nya terlebih dahulu.` },
        { status: 400 },
      )
    }

    await prisma.alat.delete({ where: { id: numId } })
    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error({ err }, '[DELETE /api/alat/[id]]')
    return NextResponse.json({ error: 'Gagal menghapus alat' }, { status: 500 })
  }
}
