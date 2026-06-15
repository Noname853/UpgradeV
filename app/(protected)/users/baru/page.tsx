import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { UserForm } from '../UserForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function TambahUserPage() {
  const session = await auth()
  if (session?.user.role !== 'admin') redirect('/dashboard')

  return (
    <div>
      <div className="mb-5 flex items-center gap-3 hud-rise">
        <Link
          href="/users"
          className="hud-clip-sm flex h-[38px] w-[38px] items-center justify-center"
          style={{ color: '#8a97a3', border: '1px solid rgba(99,102,241,0.25)' }}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="hud-title" style={{ fontSize: 22 }}>Tambah User</h1>
      </div>
      <UserForm />
    </div>
  )
}
