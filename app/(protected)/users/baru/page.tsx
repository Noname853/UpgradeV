import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { UserForm } from '../UserForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function TambahUserPage() {
  const session = await auth()
  if (session?.user.role !== 'admin') redirect('/dashboard')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/users" className="rounded-lg border border-neutral-800 p-2 text-neutral-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold text-white">Tambah User</h1>
      </div>
      <UserForm />
    </div>
  )
}
