import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { checkRateLimit } from '@/lib/rate-limit'
import { amankanSel } from '@/lib/lab-inventaris'
import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'

// Susun ulang file .xlsx dari database — format sheet mengikuti file sumber
// (lab: Jumlah/Baik/Rusak/Deskripsi; need: Barang/Jumlah/Link) + kolom Foto.
export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const allowed = await checkRateLimit(`lab-export:${session.user.id}`, 5, 60_000)
  if (!allowed) {
    return NextResponse.json({ error: 'Terlalu sering export, tunggu sebentar' }, { status: 429 })
  }

  try {
    const sheets = await prisma.labSheet.findMany({
      orderBy: { urutan: 'asc' },
      include: { items: { orderBy: { urutan: 'asc' } } },
    })

    const wb = new ExcelJS.Workbook()
    wb.creator = 'Inventaris TKJ'

    for (const s of sheets) {
      // Nama sheet Excel: maks 31 karakter, tanpa karakter terlarang.
      const ws = wb.addWorksheet(s.nama.replace(/[\\/*?:[\]]/g, ' ').slice(0, 31) || 'Sheet')
      if (s.jenis === 'need') {
        ws.columns = [
          { header: 'NO', key: 'no', width: 6 },
          { header: 'BARANG', key: 'nama', width: 34 },
          { header: 'JUMLAH', key: 'jumlah', width: 14 },
          { header: 'LINK', key: 'link', width: 40 },
          { header: 'FOTO', key: 'foto', width: 40 },
        ]
        s.items.forEach((it, i) =>
          ws.addRow({
            no: i + 1,
            nama: amankanSel(it.nama),
            jumlah: amankanSel(it.jumlah),
            link: it.link ?? '--',
            foto: it.foto ?? '',
          }),
        )
      } else {
        ws.columns = [
          { header: 'NO', key: 'no', width: 6 },
          { header: 'NAMA ALAT', key: 'nama', width: 34 },
          { header: 'JUMLAH', key: 'jumlah', width: 10 },
          { header: 'BAIK', key: 'baik', width: 8 },
          { header: 'RUSAK', key: 'rusak', width: 8 },
          { header: 'DESKRIPSI', key: 'deskripsi', width: 44 },
          { header: 'FOTO', key: 'foto', width: 40 },
        ]
        s.items.forEach((it, i) =>
          ws.addRow({
            no: i + 1,
            nama: amankanSel(it.nama),
            jumlah: amankanSel(it.jumlah),
            baik: it.baik ?? '--',
            rusak: it.rusak ?? '--',
            deskripsi: it.deskripsi ? amankanSel(it.deskripsi) : '',
            foto: it.foto ?? '',
          }),
        )
      }
      ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } }
    }

    const buffer = await wb.xlsx.writeBuffer()
    const filename = `inventaris-lab_${new Date().toISOString().slice(0, 10)}.xlsx`
    return new NextResponse(buffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    logger.error({ err }, '[GET /api/lab-inventaris/export]')
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
