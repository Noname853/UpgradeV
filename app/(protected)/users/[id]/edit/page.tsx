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
    <div>
      <div className="mb-5 flex items-center gap-3 hud-rise">
        <Link
          href="/users"
          className="hud-clip-sm flex h-[38px] w-[38px] items-center justify-center"
          style={{ color: '#8a97a3', border: '1px solid rgba(99,102,241,0.25)' }}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="hud-title" style={{ fontSize: 22 }}>Edit User</h1>
          <p className="mt-1 text-[13px]" style={{ color: '#8a97a3' }}>{user.name}</p>
        </div>
      </div>
      <UserForm initial={user} />
    </div>
  )
}
