import path from 'node:path'
import { PrismaClient } from '../lib/generated/prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import bcrypt from 'bcryptjs'

const absoluteDbPath = path.resolve(process.cwd(), 'dev.db')
const url = `file:${absoluteDbPath}`

const prisma = new PrismaClient({
  adapter: new PrismaLibSql({ url }),
})

async function main() {
  console.log('Seeding database...')

  const adminPassword = await bcrypt.hash('admin123', 10)
  const siswaPassword = await bcrypt.hash('siswa123', 10)

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
    { kode: 'JRN001', nama: 'Switch TP-Link 24 Port', kategori: 'Jaringan', stok: 5, lokasi: 'Lab Jaringan' },
    { kode: 'JRN002', nama: 'Router Mikrotik RB750', kategori: 'Jaringan', stok: 3, lokasi: 'Lab Jaringan' },
    { kode: 'JRN003', nama: 'Patch Panel 24 Port', kategori: 'Jaringan', stok: 2, lokasi: 'Lab Jaringan' },
    { kode: 'KMP001', nama: 'Laptop Acer Aspire', kategori: 'Komputer', stok: 10, lokasi: 'Lab Komputer' },
    { kode: 'KMP002', nama: 'Raspberry Pi 4', kategori: 'Komputer', stok: 8, lokasi: 'Lab Komputer' },
    { kode: 'KMP003', nama: 'Arduino Uno R3', kategori: 'Komputer', stok: 15, lokasi: 'Lab Komputer' },
    { kode: 'KBL001', nama: 'Kabel UTP Cat6 (meter)', kategori: 'Kabel', stok: 50, lokasi: 'Gudang' },
    { kode: 'KBL002', nama: 'Kabel HDMI 2m', kategori: 'Kabel', stok: 20, lokasi: 'Gudang' },
    { kode: 'ALU001', nama: 'Multimeter Digital', kategori: 'Alat Ukur', stok: 6, lokasi: 'Lab Elektronik', tanggalEos: nextYear },
    { kode: 'ALU002', nama: 'Tang Crimping', kategori: 'Alat Ukur', stok: 12, lokasi: 'Lab Elektronik' },
    { kode: 'ALU003', nama: 'Tester Kabel', kategori: 'Alat Ukur', stok: 8, lokasi: 'Lab Elektronik' },
    { kode: 'ALU004', nama: 'Solder Station', kategori: 'Alat Ukur', stok: 4, lokasi: 'Lab Elektronik', tanggalEol: sixMonths },
  ]

  for (const a of alats) {
    await prisma.alat.upsert({
      where: { kode: a.kode },
      update: {},
      create: a,
    })
  }

  const alat1 = await prisma.alat.findUnique({ where: { kode: 'JRN001' } })
  const alat2 = await prisma.alat.findUnique({ where: { kode: 'KMP001' } })
  const alat3 = await prisma.alat.findUnique({ where: { kode: 'ALU001' } })

  if (!alat1 || !alat2 || !alat3) {
    console.log('Alat not found, skipping peminjaman seed')
    return
  }

  const past14 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const future7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  await prisma.peminjaman.createMany({
    data: [
      {
        userId: budi.id,
        totalItems: 2,
        status: 'dikembalikan',
        tanggalPinjam: past14,
        tanggalBatasKembali: past7,
        tanggalKembali: past7,
        tanggalVerifikasi: past14,
        keperluan: 'Praktikum jaringan komputer',
        verifiedBy: admin.id,
        returnedBy: admin.id,
      },
      {
        userId: siti.id,
        totalItems: 1,
        status: 'dipinjam',
        tanggalPinjam: past7,
        tanggalBatasKembali: future7,
        tanggalVerifikasi: past7,
        keperluan: 'Tugas konfigurasi router',
        verifiedBy: admin.id,
      },
      {
        userId: ahmad.id,
        totalItems: 3,
        status: 'menunggu_verifikasi',
        tanggalPinjam: now,
        tanggalBatasKembali: future7,
        keperluan: 'Praktikum elektronika dasar',
      },
      {
        userId: budi.id,
        totalItems: 2,
        status: 'dibatalkan',
        tanggalPinjam: past7,
        tanggalBatasKembali: future7,
        tanggalBatal: past7,
        keperluan: 'Project akhir semester',
        alasanPembatalan: 'Jadwal praktikum berubah',
        cancelledBy: budi.id,
      },
      {
        userId: siti.id,
        totalItems: 1,
        status: 'dikembalikan',
        tanggalPinjam: past14,
        tanggalBatasKembali: past7,
        tanggalKembali: past7,
        tanggalVerifikasi: past14,
        keperluan: 'Pengukuran tegangan',
        verifiedBy: admin.id,
        returnedBy: admin.id,
      },
    ],
  })

  const peminjamans = await prisma.peminjaman.findMany({ orderBy: { id: 'asc' } })

  if (peminjamans.length >= 5) {
    await prisma.peminjamanDetail.createMany({
      data: [
        { peminjamanId: peminjamans[0].id, alatId: alat1.id, jumlah: 1 },
        { peminjamanId: peminjamans[0].id, alatId: alat2.id, jumlah: 1 },
        { peminjamanId: peminjamans[1].id, alatId: alat1.id, jumlah: 1 },
        { peminjamanId: peminjamans[2].id, alatId: alat3.id, jumlah: 2 },
        { peminjamanId: peminjamans[2].id, alatId: alat1.id, jumlah: 1 },
        { peminjamanId: peminjamans[3].id, alatId: alat2.id, jumlah: 2 },
        { peminjamanId: peminjamans[4].id, alatId: alat3.id, jumlah: 1 },
      ],
    })
  }

  console.log('Seeding complete!')
  console.log(`Admin: admin@tkj.com / admin123`)
  console.log(`Siswa: budi@tkj.com / siswa123`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
