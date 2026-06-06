import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'

export async function GET() {
  const session = await auth()
  if (session?.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Alat')

  sheet.columns = [
    { header: 'kode', key: 'kode', width: 18 },
    { header: 'nama', key: 'nama', width: 32 },
    { header: 'kategori', key: 'kategori', width: 20 },
    { header: 'stok', key: 'stok', width: 10 },
    { header: 'lokasi', key: 'lokasi', width: 20 },
    { header: 'deskripsi', key: 'deskripsi', width: 40 },
  ]

  sheet.getRow(1).font = { bold: true }
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1F2937' },
  }
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }

  sheet.addRow({
    kode: 'TKJ-001',
    nama: 'Router Mikrotik RB750',
    kategori: 'Networking',
    stok: 5,
    lokasi: 'Lab TKJ 1',
    deskripsi: 'Router untuk pembelajaran jaringan',
  })
  sheet.addRow({
    kode: 'TKJ-002',
    nama: 'Switch Cisco 2960',
    kategori: 'Networking',
    stok: 3,
    lokasi: 'Lab TKJ 1',
    deskripsi: '',
  })

  const buffer = await workbook.xlsx.writeBuffer()

  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="template-alat.xlsx"',
    },
  })
}
