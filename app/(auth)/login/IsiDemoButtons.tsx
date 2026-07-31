'use client'

// Pengisi akun demo untuk memudahkan uji coba — HANYA dirender saat development
// (dikontrol dari server page lewat NODE_ENV). Mengisi field email/password
// yang sudah ada; tidak mengubah alur auth.
export function IsiDemoButtons() {
  function isi(email: string, password: string) {
    const e = document.getElementById('email') as HTMLInputElement | null
    const p = document.getElementById('password') as HTMLInputElement | null
    if (e) e.value = email
    if (p) p.value = password
    e?.focus()
  }

  return (
    <div className="mb-4">
      <p className="mb-2 text-center text-[11px] uppercase tracking-wider text-neutral-500">
        Isi akun demo (dev)
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => isi('budi@tkj.com', 'siswa123')}
          className="tf-pill flex-1 border border-blue-500/30 bg-blue-500/10 py-2 text-[12px] font-semibold text-blue-300 transition hover:bg-blue-500/20"
        >
          Siswa
        </button>
        <button
          type="button"
          onClick={() => isi('admin@tkj.com', 'admin123')}
          className="tf-pill flex-1 border border-purple-500/30 bg-purple-500/10 py-2 text-[12px] font-semibold text-purple-300 transition hover:bg-purple-500/20"
        >
          Admin
        </button>
      </div>
    </div>
  )
}
