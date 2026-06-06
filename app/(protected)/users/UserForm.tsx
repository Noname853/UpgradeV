'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { GlassCard } from '@/components/shared/GlassCard'

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

  const inputClass =
    'w-full rounded-lg border border-neutral-700 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder-neutral-600 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30'

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

  return (
    <GlassCard className="mb-8 w-full p-8">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm text-neutral-300">Nama Lengkap *</label>
            <input name="name" required defaultValue={initial?.name} className={inputClass} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-neutral-300">Email *</label>
            <input name="email" type="email" required defaultValue={initial?.email} className={inputClass} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-neutral-300">
              Password {initial ? '(kosongkan jika tidak diubah)' : '*'}
            </label>
            <input name="password" type="password" className={inputClass} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-neutral-300">Role</label>
            <select name="role" defaultValue={initial?.role ?? 'siswa'} className={`${inputClass} bg-neutral-900`}>
              <option value="siswa">Siswa</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-neutral-300">Kelas</label>
            <input name="kelas" defaultValue={initial?.kelas ?? ''} placeholder="XII TKJ 1" className={inputClass} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-neutral-300">Kelompok</label>
            <input name="kelompok" defaultValue={initial?.kelompok ?? ''} placeholder="Kelompok A" className={inputClass} />
          </div>
        </div>

        {error && (
          <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push('/users')}
            className="rounded-lg border border-neutral-700 px-5 py-2.5 text-sm text-neutral-300 transition hover:border-neutral-600 hover:text-white"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:from-blue-500 hover:to-purple-500 disabled:opacity-60"
          >
            {loading ? 'Menyimpan...' : initial ? 'Simpan Perubahan' : 'Tambah User'}
          </button>
        </div>
      </form>
    </GlassCard>
  )
}
