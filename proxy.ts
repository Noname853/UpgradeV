import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

const protectedPaths = ['/dashboard', '/alat', '/peminjaman', '/users', '/laporan']
const authPaths = ['/login', '/register']

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isProtected = protectedPaths.some((p) => pathname === p || pathname.startsWith(p + '/'))
  const isAuth = authPaths.some((p) => pathname.startsWith(p))

  if (!isProtected && !isAuth) return NextResponse.next()

  // Verify JWT signature (not just cookie presence). Returns null on a
  // missing/expired/forged token.
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    salt:
      process.env.NODE_ENV === 'production'
        ? '__Secure-authjs.session-token'
        : 'authjs.session-token',
  })
  const isLoggedIn = !!token

  if (isProtected) {
    console.log('proxy:debug', {
      pathname,
      hasToken: isLoggedIn,
      cookies: req.cookies.getAll().map((c) => c.name),
    })
  }

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
