import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { checkRateLimit } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import QRCode from 'qrcode'

// Ukuran QR di dalam sel (piksel). Cukup besar untuk dipindai layar HP,
// tapi tidak bikin file membengkak.
const QR_PX = 140
// Tinggi baris (point) yang pas untuk QR 140px + sedikit padding.
const ROW_HEIGHT = 110
const MAX_UNITS = 5_000

function headerStyle(sheet: ExcelJS.Worksheet) {
  const row = sheet.getRow(1)
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } }
  row.alignment = { vertical: 'middle', horizontal: 'center' }
  row.height = 22
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (session?.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Membangun QR + workbook lumayan berat (ratusan unit × render PNG).
  // Batasi agar tidak dispam.
  const allowed = await checkRateLimit(`qr-excel:${session.user.id}`, 5, 60_000)
  if (!allowed) {
    return NextResponse.json({ error: 'Terlalu sering export, tunggu sebentar' }, { status: 429 })
  }

  const sp = req.nextUrl.searchParams
  const alatIdRaw = sp.get('alatId')
  const alatIdNum = alatIdRaw ? parseInt(alatIdRaw, 10) : null
  const alatId = alatIdNum && Number.isInteger(alatIdNum) && alatIdNum > 0 ? alatIdNum : null

  try {
    const units = await prisma.unit.findMany({
      where: alatId ? { alatId } : {},
      orderBy: [{ alatId: 'asc' }, { kode: 'asc' }],
      take: MAX_UNITS,
      select: {
        id: true,
        kode: true,
        kondisi: true,
        alat: { select: { nama: true, kategori: true, lokasi: true } },
      },
    })

    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Inventaris TKJ'

    const sheet = workbook.addWorksheet('QR Alat')
    sheet.columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'QR', key: 'qr', width: 22 },
      { header: 'Kode', key: 'kode', width: 18 },
      { header: 'Nama Alat', key: 'nama', width: 36 },
      { header: 'Kategori', key: 'kategori', width: 18 },
      { header: 'Lokasi', key: 'lokasi', width: 18 },
      { header: 'Kondisi', key: 'kondisi', width: 12 },
    ]
    headerStyle(sheet)

    for (let i = 0; i < units.length; i++) {
      const u = units[i]
      // Isi QR = kode unit polos, sama seperti label cetak, agar terbaca sama
      // oleh scanner kamera HP maupun alat scan fisik.
      const dataUrl = await QRCode.toDataURL(u.kode, {
        margin: 1,
        width: QR_PX,
        errorCorrectionLevel: 'M',
      })
      const base64 = dataUrl.split(',')[1] ?? ''

      const rowNumber = i + 2
      const row = sheet.getRow(rowNumber)
      row.height = ROW_HEIGHT
      row.getCell('no').value = i + 1
      row.getCell('kode').value = u.kode
      row.getCell('nama').value = u.alat.nama
      row.getCell('kategori').value = u.alat.kategori
      row.getCell('lokasi').value = u.alat.lokasi
      row.getCell('kondisi').value = u.kondisi
      row.alignment = { vertical: 'middle', horizontal: 'left' }
      row.getCell('no').alignment = { vertical: 'middle', horizontal: 'center' }

      const imageId = workbook.addImage({ base64, extension: 'png' })
      // Kolom QR = kolom ke-2 (indeks 1). Tambah offset kecil supaya QR tidak
      // menempel di garis sel.
      sheet.addImage(imageId, {
        tl: { col: 1.15, row: rowNumber - 1 + 0.1 },
        ext: { width: QR_PX, height: QR_PX },
        editAs: 'oneCell',
      })
    }

    const buffer = await workbook.xlsx.writeBuffer()
    const stamp = new Date().toISOString().slice(0, 10)
    const filename = `qr-alat_${stamp}.xlsx`

    return new NextResponse(buffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    logger.error({ err }, '[GET /api/alat/qr-excel]')
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
