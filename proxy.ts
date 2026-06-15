import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

const protectedPaths = ['/dashboard', '/alat', '/peminjaman', '/users', '/laporan']
const authPaths = ['/login', '/register']

// Bangun Content-Security-Policy berbasis nonce per-request.
// - script-src: nonce + 'strict-dynamic' menggantikan 'unsafe-inline'/'unsafe-eval'
//   sehingga hanya script Next.js (yang otomatis diberi nonce) yang boleh jalan.
// - style-src tetap 'unsafe-inline' karena UI memakai banyak atribut style={{}} inline.
// - img-src tetap https: untuk URL gambar eksternal (foto alat).
// - 'unsafe-eval' hanya di dev (React memakai eval untuk pesan debug).
function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === 'development'
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    ...(isDev ? [] : ['upgrade-insecure-requests']),
  ].join('; ')
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const csp = buildCsp(nonce)

  // Nonce diteruskan lewat request header agar Next.js membacanya saat SSR dan
  // menempelkannya ke seluruh script bawaannya.
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)

  const isProtected = protectedPaths.some((p) => pathname === p || pathname.startsWith(p + '/'))
  const isAuth = authPaths.some((p) => pathname.startsWith(p))

  // Penjagaan auth: redirect bila perlu (CSP tetap dipasang di respons redirect).
  if (isProtected || isAuth) {
    const session = await auth()
    const isLoggedIn = !!session?.user

    if (isProtected && !isLoggedIn) {
      const res = NextResponse.redirect(new URL('/login', req.url))
      res.headers.set('Content-Security-Policy', csp)
      return res
    }
    if (isAuth && isLoggedIn) {
      const res = NextResponse.redirect(new URL('/dashboard', req.url))
      res.headers.set('Content-Security-Policy', csp)
      return res
    }
  }

  const res = NextResponse.next({ request: { headers: requestHeaders } })
  res.headers.set('Content-Security-Policy', csp)
  return res
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
