import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'

export async function GET() {
  const session = await auth()
  if (session?.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const workbook = new ExcelJS.Workbook()

  // ── Sheet 1: Alat (jenis) ─────────────────────────────────────────────
  const alatSheet = workbook.addWorksheet('Alat')
  alatSheet.columns = [
    { header: 'nama', key: 'nama', width: 32 },
    { header: 'kategori', key: 'kategori', width: 20 },
    { header: 'lokasi', key: 'lokasi', width: 20 },
    { header: 'deskripsi', key: 'deskripsi', width: 40 },
  ]
  alatSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  alatSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1F2937' },
  }
  alatSheet.addRow({
    nama: 'Router Mikrotik RB951',
    kategori: 'Networking',
    lokasi: 'Kaprok',
    deskripsi: 'RouterBoard 5 port ethernet, RouterOS Level 4',
  })
  alatSheet.addRow({
    nama: 'Switch Mikrotik RB260GS',
    kategori: 'Networking',
    lokasi: 'Kaprok',
    deskripsi: '5 port Gigabit managed switch',
  })

  // ── Sheet 2: Unit (fisik per alat) ────────────────────────────────────
  const unitSheet = workbook.addWorksheet('Unit')
  unitSheet.columns = [
    { header: 'kode', key: 'kode', width: 18 },
    { header: 'nama_alat', key: 'nama_alat', width: 32 },
    { header: 'kondisi', key: 'kondisi', width: 12 },
    { header: 'catatan', key: 'catatan', width: 40 },
  ]
  unitSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  unitSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1F2937' },
  }
  unitSheet.addRow({ kode: 'RB_1', nama_alat: 'Router Mikrotik RB951', kondisi: 'baik', catatan: '' })
  unitSheet.addRow({ kode: 'RB_2', nama_alat: 'Router Mikrotik RB951', kondisi: 'baik', catatan: '' })
  unitSheet.addRow({ kode: 'RB_33', nama_alat: 'Router Mikrotik RB951', kondisi: 'rusak', catatan: 'Port 3 mati' })
  unitSheet.addRow({ kode: 'SW_1', nama_alat: 'Switch Mikrotik RB260GS', kondisi: 'baik', catatan: '' })

  const buffer = await workbook.xlsx.writeBuffer()

  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="template-inventaris.xlsx"',
    },
  })
}
