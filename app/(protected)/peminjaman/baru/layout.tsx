import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ReactNode } from 'react'

export default async function BuatPeminjamanLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (session?.user.role === 'admin') redirect('/peminjaman')
  return <>{children}</>
}
