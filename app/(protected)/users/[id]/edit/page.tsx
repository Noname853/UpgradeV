import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { UserForm } from '../../UserForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user.role !== 'admin') redirect('/dashboard')

  const { id } = await params
  const numId = Number(id)
  if (!Number.isInteger(numId) || numId <= 0) notFound()

  const user = await prisma.user.findUnique({
    where: { id: numId },
    select: { id: true, name: true, email: true, role: true, kelas: true, kelompok: true },
  })
  if (!user) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/users" className="rounded-lg border border-neutral-800 p-2 text-neutral-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Edit User</h1>
          <p className="text-sm text-neutral-400">{user.name}</p>
        </div>
      </div>
      <UserForm initial={user} />
    </div>
  )
}
