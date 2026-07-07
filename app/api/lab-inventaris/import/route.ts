import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { isSameOrigin } from '@/lib/csrf'
import { checkRateLimit } from '@/lib/rate-limit'
import { parseWorkbook, MAX_IMPORT_BYTES } from '@/lib/lab-inventaris'
import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'

// Import / ganti seluruh data inventaris lab dari file .xlsx.
// File hanya dicerna di memori lalu dibuang — tidak pernah disimpan ke disk.
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const session = await auth()
  if (!session || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Parse workbook itu kerja berat — cegah spam upload.
  const allowed = await checkRateLimit(`lab-import:${session.user.id}`, 5, 60_000)
  if (!allowed) {
    return NextResponse.json({ error: 'Terlalu sering import, tunggu sebentar' }, { status: 429 })
  }

  try {
    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })
    }
    if (file.size > MAX_IMPORT_BYTES) {
      return NextResponse.json({ error: 'File terlalu besar (maks 5 MB)' }, { status: 400 })
    }

    const buf = Buffer.from(await file.arrayBuffer())
    const wb = new ExcelJS.Workbook()
    try {
      await wb.xlsx.load(buf as unknown as ArrayBuffer)
    } catch {
      return NextResponse.json({ error: 'File bukan .xlsx yang valid' }, { status: 400 })
    }

    const hasil = parseWorkbook(wb)
    if (hasil.sheets.length === 0 || hasil.totalItems === 0) {
      return NextResponse.json(
        { error: 'Tidak ada sheet dengan header "Nama Alat"/"Barang" yang terbaca' },
        { status: 400 },
      )
    }

    // Ganti semua: hapus data lama, tulis data baru — satu transaksi agar
    // gagal di tengah tidak meninggalkan data setengah jadi.
    await prisma.$transaction(async (tx) => {
      await tx.labItem.deleteMany({})
      await tx.labSheet.deleteMany({})
      for (let s = 0; s < hasil.sheets.length; s++) {
        const sheet = hasil.sheets[s]
        const created = await tx.labSheet.create({
          data: { nama: sheet.nama, jenis: sheet.jenis, urutan: s },
        })
        if (sheet.items.length > 0) {
          await tx.labItem.createMany({
            data: sheet.items.map((it, i) => ({
              sheetId: created.id,
              nama: it.nama,
              jumlah: it.jumlah,
              baik: it.baik,
              rusak: it.rusak,
              deskripsi: it.deskripsi,
              link: it.link,
              urutan: i + 1,
            })),
          })
        }
      }
    })

    logger.info(
      { admin: session.user.id, sheets: hasil.sheets.length, items: hasil.totalItems },
      '[lab-inventaris] import mengganti seluruh data',
    )
    return NextResponse.json({
      ok: true,
      sheets: hasil.sheets.length,
      items: hasil.totalItems,
      skippedSheets: hasil.skipped,
    })
  } catch (err) {
    logger.error({ err }, '[POST /api/lab-inventaris/import]')
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
