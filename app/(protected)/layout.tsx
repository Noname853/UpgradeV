import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ProtectedLayoutClient } from '@/components/layout/ProtectedLayoutClient'
import { ReactNode } from 'react'

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <ProtectedLayoutClient userName={session.user.name} userRole={session.user.role}>
      {children}
    </ProtectedLayoutClient>
  )
}
