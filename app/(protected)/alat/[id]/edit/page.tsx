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
      <div className="flex items-center gap-3 hud-rise">
        <Link
          href={`/alat/${id}`}
          className="hud-clip-sm flex h-[38px] w-[38px] items-center justify-center"
          style={{ color: '#8a97a3', border: '1px solid rgba(99,102,241,0.25)' }}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="hud-title" style={{ fontSize: 22 }}>Edit Alat</h1>
          <p className="mt-1 text-[13px]" style={{ color: '#8a97a3' }}>{alat.nama}</p>
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
