import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { InventarisLabClient } from './InventarisLabClient'

// Sensus kondisi & stok per lab (data dari file Excel yang diimpor).
// Khusus admin — memetakan seluruh isi lab.
export default async function InventarisLabPage() {
  const session = await auth()
  if (session?.user.role !== 'admin') redirect('/dashboard')

  const sheets = await prisma.labSheet.findMany({
    orderBy: { urutan: 'asc' },
    include: { items: { orderBy: { urutan: 'asc' } } },
  })

  return (
    <InventarisLabClient
      sheets={sheets.map((s) => ({
        id: s.id,
        nama: s.nama,
        jenis: s.jenis === 'need' ? 'need' : 'lab',
        items: s.items.map((it) => ({
          id: it.id,
          nama: it.nama,
          jumlah: it.jumlah,
          baik: it.baik,
          rusak: it.rusak,
          deskripsi: it.deskripsi,
          link: it.link,
          foto: it.foto,
        })),
      }))}
    />
  )
}
