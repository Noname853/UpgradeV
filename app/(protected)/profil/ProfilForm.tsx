'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'

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
    // Sertakan nama yang masih ada di kotak input agar tidak hilang saat
    // user lupa klik "Tambah" sebelum menyimpan.
    const pending = newAnggota.trim()
    const finalAnggota =
      pending && !anggota.includes(pending) ? [...anggota, pending] : anggota
    if (finalAnggota !== anggota) {
      setAnggota(finalAnggota)
      setNewAnggota('')
    }

    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const res = await fetch('/api/profil', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kelompok, anggotaKelompok: finalAnggota }),
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
    <div className="hud-panel hud-accent-top hud-rise p-[22px]">
      <h2 className="hud-label mb-3.5 text-[11px]" style={{ color: '#c3ccd6' }}>
        Kelompok
      </h2>

      <div className="flex flex-col gap-4">
        <div>
          <label className="hud-label mb-1.5 block text-[11px]" style={{ color: '#8a97a3' }}>
            Nama Kelompok
          </label>
          <input
            name="kelompok"
            value={kelompok}
            onChange={(e) => setKelompok(e.target.value)}
            placeholder="Contoh: Kelompok 3A"
            className="hud-input w-full"
          />
        </div>

        <div>
          <label className="hud-label mb-2 block text-[11px]" style={{ color: '#8a97a3' }}>
            Anggota <span style={{ color: '#6b7785' }}>({anggota.length} orang)</span>
          </label>

          {anggota.length > 0 && (
            <ul className="mb-3 flex flex-col gap-2">
              {anggota.map((nama, idx) => (
                <li
                  key={idx}
                  className="hud-clip-sm flex items-center justify-between gap-2.5 px-3 py-2.5"
                  style={{
                    border: '1px solid rgba(99,102,241,0.14)',
                    background: 'rgba(255,255,255,0.02)',
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="inline-flex items-center justify-center"
                      style={{
                        width: 20,
                        height: 20,
                        fontSize: 11,
                        color: '#5c84ff',
                        background: 'rgba(92,132,255,0.18)',
                        borderRadius: '50%',
                      }}
                    >
                      {idx + 1}
                    </span>
                    <span className="text-[13.5px]" style={{ color: '#e8edf2' }}>{nama}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAnggota(idx)}
                    className="transition"
                    style={{ color: '#6b7785' }}
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
              name="newAnggota"
              value={newAnggota}
              onChange={(e) => setNewAnggota(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAnggota())}
              placeholder="Nama anggota..."
              className="hud-input w-full"
            />
            <button
              type="button"
              onClick={addAnggota}
              className="hud-btn-ghost inline-flex shrink-0 items-center gap-1.5 px-4 text-[12px]"
            >
              <Plus className="h-4 w-4" />
              TAMBAH
            </button>
          </div>
        </div>

        {error && (
          <p
            className="hud-clip-sm px-3 py-2 text-[13px]"
            style={{
              color: '#ef4444',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.25)',
            }}
          >
            {error}
          </p>
        )}

        {saved && (
          <p
            className="hud-clip-sm px-3 py-2 text-[13px]"
            style={{
              color: '#22c55e',
              background: 'rgba(34,197,94,0.1)',
              border: '1px solid rgba(34,197,94,0.25)',
            }}
          >
            Tersimpan!
          </p>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="hud-btn-primary w-full px-[22px] py-3 text-[12px] disabled:opacity-40"
        >
          {saving ? 'MENYIMPAN...' : 'SIMPAN KELOMPOK'}
        </button>
      </div>
    </div>
  )
}
