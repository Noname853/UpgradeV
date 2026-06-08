import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

const protectedPaths = ['/dashboard', '/alat', '/peminjaman', '/users', '/laporan']
const authPaths = ['/login', '/register']

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isProtected = protectedPaths.some((p) => pathname === p || pathname.startsWith(p + '/'))
  const isAuth = authPaths.some((p) => pathname.startsWith(p))

  if (!isProtected && !isAuth) return NextResponse.next()

  const session = await auth()
  const isLoggedIn = !!session?.user

  if (isProtected && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (isAuth && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
