import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { isSameOrigin } from '@/lib/csrf'
import { getBookingDibuka, setBookingDibuka, dalamJamOperasional } from '@/lib/pengaturan'
import { z } from 'zod'

// Status buka/tutup booking. Dibaca semua user login (siswa perlu tahu apakah
// boleh mengajukan lewat "pilih dari daftar"). `bookingDibuka` di sini sudah
// gabungan saklar admin + jam operasional — `dalamJamOperasional` dikirim
// terpisah supaya UI bisa bedakan pesan "ditutup admin" vs "di luar jam".
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const manualDibuka = await getBookingDibuka()
    const jamOperasional = dalamJamOperasional()
    return NextResponse.json({ bookingDibuka: manualDibuka && jamOperasional, dalamJamOperasional: jamOperasional })
  } catch (err) {
    logger.error({ err }, '[GET /api/pengaturan]')
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

const patchSchema = z.object({ bookingDibuka: z.boolean() }).strict()

// Ubah status buka/tutup. Khusus admin.
export async function PATCH(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const session = await auth()
  if (!session || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })

  try {
    const row = await setBookingDibuka(parsed.data.bookingDibuka, parseInt(session.user.id))
    return NextResponse.json({ bookingDibuka: row.bookingDibuka })
  } catch (err) {
    logger.error({ err }, '[PATCH /api/pengaturan]')
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
