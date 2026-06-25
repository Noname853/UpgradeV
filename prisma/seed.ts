import { PrismaClient } from '../lib/generated/prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import bcrypt from 'bcryptjs'

function buildAdapter() {
  const raw = process.env.DATABASE_URL ?? 'file:./dev.db'
  if (/^(libsql|https?):\/\//i.test(raw)) {
    const authToken = process.env.DATABASE_AUTH_TOKEN
    if (!authToken) throw new Error('DATABASE_AUTH_TOKEN is required for remote libSQL')
    return new PrismaLibSql({ url: raw, authToken })
  }
  return new PrismaLibSql({ url: raw })
}

const prisma = new PrismaClient({ adapter: buildAdapter() })

async function main() {
  // Guardrail: never seed default credentials into production unless an
  // operator explicitly opts in. Demo accounts in prod are how breaches happen.
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PROD_SEED !== 'true') {
    throw new Error(
      'Refusing to seed in production. Set ALLOW_PROD_SEED=true and provide SEED_ADMIN_PASSWORD / SEED_SISWA_PASSWORD to override.',
    )
  }

  console.log('Seeding database...')

  const adminPlain = process.env.SEED_ADMIN_PASSWORD ?? 'admin123'
  const siswaPlain = process.env.SEED_SISWA_PASSWORD ?? 'siswa123'

  if (process.env.NODE_ENV === 'production') {
    if (!process.env.SEED_ADMIN_PASSWORD || !process.env.SEED_SISWA_PASSWORD) {
      throw new Error(
        'SEED_ADMIN_PASSWORD and SEED_SISWA_PASSWORD must be set when seeding in production',
      )
    }
  }

  const adminPassword = await bcrypt.hash(adminPlain, 10)
  const siswaPassword = await bcrypt.hash(siswaPlain, 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@tkj.com' },
    update: {},
    create: {
      name: 'Administrator',
      email: 'admin@tkj.com',
      password: adminPassword,
      role: 'admin',
      kelas: null,
      kelompok: null,
    },
  })

  const budi = await prisma.user.upsert({
    where: { email: 'budi@tkj.com' },
    update: {},
    create: {
      name: 'Budi Santoso',
      email: 'budi@tkj.com',
      password: siswaPassword,
      role: 'siswa',
      kelas: 'XII TKJ 1',
      kelompok: 'Kelompok A',
    },
  })

  const siti = await prisma.user.upsert({
    where: { email: 'siti@tkj.com' },
    update: {},
    create: {
      name: 'Siti Rahayu',
      email: 'siti@tkj.com',
      password: siswaPassword,
      role: 'siswa',
      kelas: 'XII TKJ 1',
      kelompok: 'Kelompok A',
    },
  })

  const ahmad = await prisma.user.upsert({
    where: { email: 'ahmad@tkj.com' },
    update: {},
    create: {
      name: 'Ahmad Fauzi',
      email: 'ahmad@tkj.com',
      password: siswaPassword,
      role: 'siswa',
      kelas: 'XI TKJ 2',
      kelompok: 'Kelompok B',
    },
  })

  const now = new Date()
  const nextYear = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
  const sixMonths = new Date(now.getFullYear(), now.getMonth() + 6, now.getDate())

  const alats = [
    { nama: 'Switch TP-Link 24 Port', kategori: 'Jaringan', lokasi: 'Lab Jaringan', kodes: ['SW_TP_1', 'SW_TP_2', 'SW_TP_3'] },
    { nama: 'Router Mikrotik RB750', kategori: 'Jaringan', lokasi: 'Lab Jaringan', kodes: ['RB750_1', 'RB750_2'] },
    { nama: 'Laptop Acer Aspire', kategori: 'Komputer', lokasi: 'Lab Komputer', kodes: ['LAP_1', 'LAP_2', 'LAP_3'] },
    { nama: 'Multimeter Digital', kategori: 'Alat Ukur', lokasi: 'Lab Elektronik', tanggalEos: nextYear, kodes: ['MM_1', 'MM_2'] },
    { nama: 'Tang Crimping', kategori: 'Alat Ukur', lokasi: 'Lab Elektronik', kodes: ['TC_1', 'TC_2'] },
    { nama: 'Solder Station', kategori: 'Alat Ukur', lokasi: 'Lab Elektronik', tanggalEol: sixMonths, kodes: ['SS_1'] },
  ]

  for (const a of alats) {
    const { kodes, ...alatData } = a
    const alat = await prisma.alat.upsert({
      where: { nama: alatData.nama },
      update: {},
      create: alatData,
    })
    for (const kode of kodes) {
      await prisma.unit.upsert({
        where: { kode },
        update: {},
        create: { kode, alatId: alat.id, kondisi: 'baik' },
      })
    }
  }

  console.log(`Seeded ${alats.length} alat, ${alats.reduce((s, a) => s + a.kodes.length, 0)} unit`)
  void budi; void siti; void ahmad; void admin // peminjaman seed dilewati untuk Plan B (siap dipakai testing manual)

  console.log('Seeding complete!')
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Admin: admin@tkj.com / ${adminPlain}`)
    console.log(`Siswa: budi@tkj.com / ${siswaPlain}`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
