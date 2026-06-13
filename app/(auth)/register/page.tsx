'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

type Pill = { val: string; label: string }
const TINGKAT: Pill[] = [
  { val: '10', label: '10' },
  { val: '11', label: '11' },
  { val: '12', label: '12' },
]
const JURUSAN: Pill[] = [
  { val: 'TKJ', label: 'TKJ' },
  { val: 'TSM', label: 'TSM' },
  { val: 'TKR', label: 'TKR' },
]
const ROMBEL: Pill[] = ['A', 'B', 'C', 'D', 'E', 'F'].map((c) => ({ val: c, label: c }))

function PillButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'tf-pill flex-1 min-w-[44px] rounded-lg border px-0 py-2 text-sm font-semibold transition select-none ' +
        (active
          ? 'border-transparent bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-[0_4px_14px_rgba(99,102,241,0.35)]'
          : 'border-neutral-700 bg-white/[0.02] text-neutral-300 hover:border-neutral-500 hover:bg-white/[0.05]')
      }
    >
      {children}
    </button>
  )
}

export default function RegisterPage() {
  const [nama, setNama] = useState('')
  const [email, setEmail] = useState('')
  const [tingkat, setTingkat] = useState<string | null>(null)
  const [jurusan, setJurusan] = useState<string | null>(null)
  const [rombel, setRombel] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [topError, setTopError] = useState<string | null>(null)
  const [errors, setErrors] = useState<{ [k: string]: string }>({})
  const [done, setDone] = useState<{ name: string; kelas: string } | null>(null)

  const kelasLabel = useMemo(() => {
    if (!tingkat || !jurusan || !rombel) return ''
    return `${tingkat} ${jurusan} ${rombel}`
  }, [tingkat, jurusan, rombel])

  const canSubmit =
    nama.trim().length >= 2 &&
    /^\S+@\S+\.\S+$/.test(email.trim()) &&
    !!tingkat &&
    !!jurusan &&
    !!rombel &&
    password.length >= 6 &&
    !submitting

  async function onSubmit() {
    const next: { [k: string]: string } = {}
    if (nama.trim().length < 2) next.nama = 'Nama minimal 2 karakter'
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'Email tidak valid'
    if (!tingkat || !jurusan || !rombel) next.kelas = 'Lengkapi pilihan kelas'
    if (password.length < 6) next.password = 'Password minimal 6 karakter'
    setErrors(next)
    if (Object.keys(next).length) return

    setSubmitting(true)
    setTopError(null)
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nama.trim(),
          email: email.trim().toLowerCase(),
          password,
          kelas: kelasLabel,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setTopError(data.error ?? 'Gagal mendaftar, coba lagi')
        setSubmitting(false)
        return
      }
      setDone({ name: nama.trim(), kelas: kelasLabel })
    } catch {
      setTopError('Tidak bisa terhubung ke server')
      setSubmitting(false)
    }
  }

  // ── Layar sukses ─────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="tf-card glass-card w-full max-w-sm p-8 text-center">
        <style>{TF_STYLE}</style>
        <span className="tf-scan" aria-hidden />
        <span className="tf-br tf-br-tl" aria-hidden />
        <span className="tf-br tf-br-br" aria-hidden />

        <div className="relative" style={{ zIndex: 2 }}>
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-blue-400/40 bg-blue-500/15 text-3xl text-blue-300">
            ✓
          </div>
          <h1 className="tf-head mb-1 text-2xl font-bold text-white">Pendaftaran berhasil</h1>
          <p className="mb-5 text-sm text-neutral-400">Selamat datang, {done.name}!</p>
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-xl border border-blue-400/30 bg-blue-500/10 px-5 py-3 text-lg font-semibold text-white">
            {done.kelas}
          </div>
          <Link
            href="/login?registered=1"
            className="tf-btn tf-head block w-full rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 py-2.5 text-sm font-semibold text-white transition hover:from-blue-500 hover:to-purple-500"
          >
            Login Sekarang
            <span className="tf-sweep" aria-hidden />
          </Link>
        </div>
      </div>
    )
  }

  // ── Form ──────────────────────────────────────────────────────────────
  return (
    <div className="tf-card glass-card w-full max-w-sm p-8">
      {/* Tema Transformers: dekorasi HUD (warna & teks tidak berubah) */}
      <style>{TF_STYLE}</style>
      <span className="tf-scan" aria-hidden />
      <span className="tf-br tf-br-tl" aria-hidden />
      <span className="tf-br tf-br-br" aria-hidden />

      <div className="relative" style={{ zIndex: 2 }}>
        <h1 className="tf-head mb-1 text-2xl font-bold text-white">Daftar</h1>
        <p className="mb-6 text-sm text-neutral-400">Buat akun siswa baru</p>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-neutral-300">Nama Lengkap</label>
            <input
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Budi Santoso"
              className="tf-input w-full rounded-lg border border-neutral-700 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder-neutral-600 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
            />
            {errors.nama && <p className="mt-1 text-xs text-red-400">{errors.nama}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-neutral-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              className="tf-input w-full rounded-lg border border-neutral-700 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder-neutral-600 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
            />
            {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-neutral-300">Pilih Kelas</label>
            <div className="flex gap-2">
              {TINGKAT.map((p) => (
                <PillButton key={p.val} active={tingkat === p.val} onClick={() => setTingkat(p.val)}>
                  {p.label}
                </PillButton>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-neutral-300">Pilih Jurusan</label>
            <div className="flex gap-2">
              {JURUSAN.map((p) => (
                <PillButton key={p.val} active={jurusan === p.val} onClick={() => setJurusan(p.val)}>
                  {p.label}
                </PillButton>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-neutral-300">Pilih Rombel</label>
            <div className="flex flex-wrap gap-2">
              {ROMBEL.map((p) => (
                <PillButton key={p.val} active={rombel === p.val} onClick={() => setRombel(p.val)}>
                  {p.label}
                </PillButton>
              ))}
            </div>
            {errors.kelas && <p className="mt-1 text-xs text-red-400">{errors.kelas}</p>}
          </div>

          <div className="rounded-xl border border-dashed border-neutral-700 bg-blue-500/[0.06] px-4 py-3">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-neutral-500">
              Kelas Kamu
            </div>
            <div
              className={
                'text-lg font-bold tracking-wide ' +
                (kelasLabel
                  ? 'bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent'
                  : 'text-neutral-600')
              }
            >
              {kelasLabel || 'belum dipilih'}
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm text-neutral-300">Password</label>
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="text-xs font-semibold text-blue-400 hover:text-blue-300"
              >
                {showPass ? 'Sembunyikan' : 'Lihat'}
              </button>
            </div>
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              className="tf-input w-full rounded-lg border border-neutral-700 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder-neutral-600 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
            />
            {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}
          </div>

          {topError && (
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {topError}
            </p>
          )}

          <button
            type="button"
            disabled={!canSubmit}
            onClick={onSubmit}
            className="tf-btn tf-head w-full rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 py-2.5 text-sm font-semibold text-white transition hover:from-blue-500 hover:to-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Mendaftarkan…' : 'Daftar Sekarang'}
            <span className="tf-sweep" aria-hidden />
          </button>
        </div>

        <p className="mt-4 text-center text-sm text-neutral-500">
          Sudah punya akun?{' '}
          <Link href="/login" className="text-blue-400 hover:text-blue-300">
            Masuk
          </Link>
        </p>
      </div>
    </div>
  )
}

// Tema Transformers — hanya dekorasi visual (sudut menyiku, garis aksen, scan-line,
// corner bracket, shimmer tombol). Tidak mengubah warna/teks. Animasi ringan (CSS).
const TF_STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;800;900&display=swap');
.tf-card{position:relative;overflow:hidden;clip-path:polygon(16px 0,100% 0,100% calc(100% - 16px),calc(100% - 16px) 100%,0 100%,0 16px)}
.tf-card::before{content:'';position:absolute;left:0;top:0;height:2px;width:100%;background:linear-gradient(90deg,#2563eb,#9333ea);z-index:3}
.tf-scan{position:absolute;left:0;right:0;top:0;height:40px;background:linear-gradient(180deg,transparent,rgba(59,130,246,.07) 60%,rgba(59,130,246,.16));animation:tfScan 7.5s linear infinite;pointer-events:none;z-index:1}
.tf-br{position:absolute;width:18px;height:18px;animation:tfBlink 4s ease-in-out infinite;z-index:3;pointer-events:none}
.tf-br-tl{left:9px;top:9px;border-left:2px solid rgba(99,102,241,.5);border-top:2px solid rgba(99,102,241,.5)}
.tf-br-br{right:9px;bottom:9px;border-right:2px solid rgba(147,51,234,.5);border-bottom:2px solid rgba(147,51,234,.5);animation-delay:1s}
.tf-head{font-family:'Orbitron',sans-serif!important;text-transform:uppercase;letter-spacing:.5px}
.tf-input{clip-path:polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)}
.tf-btn{position:relative;clip-path:polygon(11px 0,100% 0,100% calc(100% - 11px),calc(100% - 11px) 100%,0 100%,0 11px);overflow:hidden}
.tf-sweep{position:absolute;top:0;bottom:0;left:0;width:36%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.4),transparent);animation:tfSweep 3.2s ease-in-out infinite;pointer-events:none}
.tf-pill{clip-path:polygon(7px 0,100% 0,100% calc(100% - 7px),calc(100% - 7px) 100%,0 100%,0 7px);border-radius:0 !important}
@keyframes tfScan{0%{transform:translateY(-40px);opacity:0}10%{opacity:1}90%{opacity:1}100%{transform:translateY(900px);opacity:0}}
@keyframes tfBlink{0%,100%{opacity:.85}50%{opacity:.35}}
@keyframes tfSweep{from{transform:translateX(-130%) skewX(-20deg)}to{transform:translateX(360%) skewX(-20deg)}}
@media (prefers-reduced-motion:reduce){.tf-scan,.tf-br,.tf-sweep{animation:none !important}}
`
