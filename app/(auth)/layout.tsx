import { ReactNode } from 'react'
import Link from 'next/link'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4">
      <Link href="/" className="mb-8 gradient-text text-2xl font-bold tracking-tight">
        Iventaris_TKJ
      </Link>
      {children}
    </div>
  )
}
