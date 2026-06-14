import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AlatForm } from './AlatForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function TambahAlatPage() {
  const session = await auth()
  if (session?.user.role !== 'admin') redirect('/alat')

  return (
    <div className="mx-auto max-w-[1120px] space-y-6">
      <div className="flex items-center gap-3 hud-rise">
        <Link
          href="/alat"
          className="hud-clip-sm flex h-[38px] w-[38px] items-center justify-center"
          style={{ color: '#8a97a3', border: '1px solid rgba(99,102,241,0.25)' }}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="hud-title" style={{ fontSize: 22 }}>Tambah Alat</h1>
          <p className="mt-1 text-[13px]" style={{ color: '#8a97a3' }}>Daftarkan alat baru ke inventaris</p>
        </div>
      </div>
      <AlatForm />
    </div>
  )
}
