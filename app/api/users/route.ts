import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = req.nextUrl
  const search = searchParams.get('search') ?? ''
  const showAll = searchParams.get('all') === 'true'
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1') || 1)
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '10') || 10))
  const skip = (page - 1) * limit

  const where = {
    ...(showAll ? {} : { isActive: true }),
    ...(search ? { OR: [{ name: { contains: search } }, { email: { contains: search } }] } : {}),
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, role: true, kelas: true, kelompok: true, createdAt: true },
    }),
    prisma.user.count({ where }),
  ])

  return NextResponse.json({ data: users, total, page, limit, pages: Math.ceil(total / limit) })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await req.json()
    const { name, email, password, role, kelas, kelompok } = body

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, dan password wajib' }, { status: 400 })
    }

    const finalRole = role ?? 'siswa'
    if (finalRole !== 'admin' && finalRole !== 'siswa') {
      return NextResponse.json({ error: 'Role tidak valid' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return NextResponse.json({ error: 'Email sudah digunakan' }, { status: 400 })

    const hashed = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role: finalRole, kelas: kelas ?? null, kelompok: kelompok ?? null },
      select: { id: true, name: true, email: true, role: true, kelas: true },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (err) {
    console.error('[POST /api/users]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
