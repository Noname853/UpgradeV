'use client'

import { useState } from 'react'
import { GlassCard } from '@/components/shared/GlassCard'
import { Plus, Trash2, Users } from 'lucide-react'

interface Props {
  kelompok: string | null
  anggota: string[]
}

export function ProfilForm({ kelompok: initialKelompok, anggota: initialAnggota }: Props) {
  const [kelompok, setKelompok] = useState(initialKelompok ?? '')
  const [anggota, setAnggota] = useState<string[]>(initialAnggota)
  const [newAnggota, setNewAnggota] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const inputClass =
    'w-full rounded-lg border border-neutral-700 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder-neutral-600 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30'

  function addAnggota() {
    const nama = newAnggota.trim()
    if (!nama) return
    if (anggota.includes(nama)) { setError('Nama sudah ada di daftar'); return }
    setAnggota((prev) => [...prev, nama])
    setNewAnggota('')
    setError('')
  }

  function removeAnggota(idx: number) {
    setAnggota((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const res = await fetch('/api/profil', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kelompok, anggotaKelompok: anggota }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Gagal menyimpan')
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch {
      setError('Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <GlassCard className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <Users className="h-4 w-4 text-blue-400" />
        <h2 className="text-sm font-semibold text-neutral-300">Kelompok Saya</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm text-neutral-300">Nama Kelompok</label>
          <input
            value={kelompok}
            onChange={(e) => setKelompok(e.target.value)}
            placeholder="Contoh: Kelompok 3A"
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-neutral-300">
            Anggota <span className="text-neutral-500">({anggota.length} orang)</span>
          </label>

          {anggota.length > 0 && (
            <ul className="mb-3 space-y-1.5">
              {anggota.map((nama, idx) => (
                <li key={idx} className="flex items-center justify-between rounded-lg border border-neutral-800 bg-white/[0.02] px-3 py-2">
                  <span className="text-sm text-white">{nama}</span>
                  <button
                    type="button"
                    onClick={() => removeAnggota(idx)}
                    className="text-neutral-500 hover:text-red-400 transition"
                    aria-label="Hapus anggota"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-2">
            <input
              value={newAnggota}
              onChange={(e) => setNewAnggota(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAnggota())}
              placeholder="Nama anggota..."
              className={inputClass}
            />
            <button
              type="button"
              onClick={addAnggota}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-300 hover:text-white transition"
            >
              <Plus className="h-4 w-4" />
              Tambah
            </button>
          </div>
        </div>

        {error && (
          <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
        )}

        {saved && (
          <p className="rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-2 text-sm text-green-400">Tersimpan!</p>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 py-2.5 text-sm font-semibold text-white transition hover:from-blue-500 hover:to-purple-500 disabled:opacity-40"
        >
          {saving ? 'Menyimpan...' : 'Simpan Kelompok'}
        </button>
      </div>
    </GlassCard>
  )
}
