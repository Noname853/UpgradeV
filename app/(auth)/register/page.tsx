import Link from 'next/link'
import RegisterForm from './RegisterForm'

export default function RegisterPage() {
  // Saklar tutup pendaftaran: set REGISTRASI_DITUTUP=true untuk menolak akun siswa baru.
  // Enforcement sesungguhnya ada di POST /api/register; ini hanya UI ramah pengguna.
  if (process.env.REGISTRASI_DITUTUP === 'true') {
    return (
      <div className="glass-card w-full max-w-sm p-8 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-red-400/40 bg-red-500/15 text-3xl text-red-300">
          🔒
        </div>
        <h1 className="mb-1 text-2xl font-bold text-white">Pendaftaran Ditutup</h1>
        <p className="mb-6 text-sm text-neutral-400">
          Pendaftaran akun siswa baru sedang ditutup. Hubungi admin lab jika kamu butuh akun.
        </p>
        <Link
          href="/login"
          className="block w-full rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 py-2.5 text-sm font-semibold text-white transition hover:from-blue-500 hover:to-purple-500"
        >
          Kembali ke Login
        </Link>
      </div>
    )
  }

  return <RegisterForm />
}
