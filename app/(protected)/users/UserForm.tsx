'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface UserFormProps {
  initial?: {
    id: number
    name: string
    email: string
    role: string
    kelas: string | null
    kelompok: string | null
  }
}

export function UserForm({ initial }: UserFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const inputClass = 'hud-input w-full px-[13px] py-[11px] text-[14px]'

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.currentTarget)

    const body: Record<string, unknown> = {
      name: fd.get('name'),
      email: fd.get('email'),
      role: fd.get('role'),
      kelas: fd.get('kelas') || null,
      kelompok: fd.get('kelompok') || null,
    }

    const password = fd.get('password')
    if (password) body.password = password

    const method = initial ? 'PUT' : 'POST'
    const url = initial ? `/api/users/${initial.id}` : '/api/users'

    if (!initial) {
      if (!password) { setError('Password wajib untuk user baru'); setLoading(false); return }
    }

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Gagal menyimpan')
      setLoading(false)
    } else {
      router.push('/users')
    }
  }

  const labelClass = 'mb-[7px] block text-[13px]'
  const labelStyle = { color: '#b3bdc7' }

  return (
    <div className="hud-panel hud-accent-top hud-rise mb-8 w-full max-w-[720px] p-[26px]">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-[18px] sm:grid-cols-2">
          <div>
            <label className={labelClass} style={labelStyle}>Nama Lengkap *</label>
            <input name="name" required defaultValue={initial?.name} className={inputClass} />
          </div>
          <div>
            <label className={labelClass} style={labelStyle}>Email *</label>
            <input name="email" type="email" required defaultValue={initial?.email} className={inputClass} />
          </div>
          <div>
            <label className={labelClass} style={labelStyle}>
              Password {initial ? '(kosongkan jika tidak diubah)' : '*'}
            </label>
            <input name="password" type="password" className={inputClass} />
          </div>
          <div>
            <label className={labelClass} style={labelStyle}>Role</label>
            <select name="role" defaultValue={initial?.role ?? 'siswa'} className={inputClass} style={{ background: '#0e0f14' }}>
              <option value="siswa">Siswa</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className={labelClass} style={labelStyle}>Kelas</label>
            <input name="kelas" defaultValue={initial?.kelas ?? ''} placeholder="XII TKJ 1" className={inputClass} />
          </div>
          <div>
            <label className={labelClass} style={labelStyle}>Kelompok</label>
            <input name="kelompok" defaultValue={initial?.kelompok ?? ''} placeholder="Kelompok A" className={inputClass} />
          </div>
        </div>

        {error && (
          <p
            className="hud-clip-sm px-3 py-2 text-[13px]"
            style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            {error}
          </p>
        )}

        <div className="flex justify-end gap-[11px] pt-2">
          <button
            type="button"
            onClick={() => router.push('/users')}
            className="hud-btn-ghost px-[22px] py-3 text-[12px]"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="hud-btn-primary px-6 py-3 text-[12px] disabled:opacity-60"
          >
            {loading ? 'Menyimpan...' : initial ? 'Simpan Perubahan' : 'Tambah User'}
          </button>
        </div>
      </form>
    </div>
  )
}
