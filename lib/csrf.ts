// Cek CSRF sederhana via header Origin/Referer.
//
// Kenapa: rute mutasi di /api/* hanya dijaga cookie session dengan SameSite=Lax,
// yang memblokir kebanyakan serangan cross-site tapi bukan jaminan kuat.
// Memverifikasi Origin/Referer cocok dengan host server menutup jendela itu
// tanpa perlu CSRF token karena form/aksi internal selalu mengirim Origin.
//
// Catatan:
// - Browser selalu mengirim header Origin untuk fetch POST/PUT/DELETE/PATCH.
// - Beberapa klien non-browser (curl/Postman) tidak mengirim Origin: kasus itu
//   ditolak. Klien yang sah cukup memasang Host sama dengan tujuan.
// - Saat dijalankan di belakang reverse proxy (Vercel), host efektif diambil
//   dari header `x-forwarded-host` lalu fallback ke `host`.

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export function isSameOrigin(req: Request): boolean {
  if (SAFE_METHODS.has(req.method)) return true

  const headers = req.headers
  const host = headers.get('x-forwarded-host') ?? headers.get('host')
  if (!host) return false

  const proto = headers.get('x-forwarded-proto') ?? 'https'
  const expectedOrigin = `${proto}://${host}`

  const origin = headers.get('origin')
  if (origin) return origin === expectedOrigin

  // Sebagian alur (mis. redirect tertentu) tidak menyertakan Origin tapi tetap
  // mengirim Referer. Anggap valid bila Referer berasal dari host yang sama.
  const referer = headers.get('referer')
  if (referer) {
    try {
      return new URL(referer).origin === expectedOrigin
    } catch {
      return false
    }
  }

  return false
}
