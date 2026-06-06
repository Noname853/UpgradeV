import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AlatForm } from './AlatForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function TambahAlatPage() {
  const session = await auth()
  if (session?.user.role !== 'admin') redirect('/alat')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/alat" className="rounded-lg border border-neutral-800 p-2 text-neutral-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Tambah Alat</h1>
          <p className="text-sm text-neutral-400">Daftarkan alat baru ke inventaris</p>
        </div>
      </div>
      <AlatForm />
    </div>
  )
}
