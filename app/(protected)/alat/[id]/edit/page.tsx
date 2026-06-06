import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { AlatForm } from '../../baru/AlatForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function EditAlatPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user.role !== 'admin') redirect('/alat')

  const { id } = await params
  const numId = Number(id)
  if (!Number.isInteger(numId) || numId <= 0) notFound()

  const alat = await prisma.alat.findUnique({ where: { id: numId } })
  if (!alat) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/alat/${id}`} className="rounded-lg border border-neutral-800 p-2 text-neutral-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Edit Alat</h1>
          <p className="text-sm text-neutral-400">{alat.nama}</p>
        </div>
      </div>
      <AlatForm
        initial={{
          ...alat,
          tanggalEos: alat.tanggalEos?.toISOString().split('T')[0],
          tanggalEol: alat.tanggalEol?.toISOString().split('T')[0],
        }}
      />
    </div>
  )
}
