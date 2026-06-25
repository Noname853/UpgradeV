'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Wrench, CheckCircle2, Trash2, AlertCircle } from 'lucide-react'

interface UnitRow {
  id: number
  kode: string
  kondisi: 'baik' | 'rusak'
  catatan: string | null
  status: 'tersedia' | 'dipinjam' | 'rusak'
  peminjaman: {
    id: number
    status: string
    user: { name: string; kelas: string | null }
  } | null
}

interface Props {
  alatId: number
  initialUnits: UnitRow[]
}

const STATUS_FILTERS = [
  { label: 'Semua', value: 'all' as const },
  { label: 'Tersedia', value: 'tersedia' as const },
  { label: 'Dipinjam', value: 'dipinjam' as const },
  { label: 'Rusak', value: 'rusak' as const },
]

export function UnitManager({ alatId, initialUnits }: Props) {
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | 'tersedia' | 'dipinjam' | 'rusak'>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [newKode, setNewKode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const filtered = filter === 'all' ? initialUnits : initialUnits.filter((u) => u.status === filter)
  const counts = {
    all: initialUnits.length,
    tersedia: initialUnits.filter((u) => u.status === 'tersedia').length,
    dipinjam: initialUnits.filter((u) => u.status === 'dipinjam').length,
    rusak: initialUnits.filter((u) => u.status === 'rusak').length,
  }

  async function addUnit() {
    if (!newKode.trim()) { setError('Kode unit wajib diisi'); return }
    setLoading(true); setError('')
    const res = await fetch('/api/units', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kode: newKode.trim(), alatId, kondisi: 'baik' }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Gagal menambah unit'); setLoading(false); return }
    setNewKode(''); setShowAdd(false); setLoading(false)
    router.refresh()
  }

  async function toggleKondisi(unit: UnitRow) {
    if (unit.status === 'dipinjam') return
    const next = unit.kondisi === 'baik' ? 'rusak' : 'baik'
    const catatan = next === 'rusak' ? prompt('Catatan kerusakan (opsional):') ?? unit.catatan : unit.catatan
    setLoading(true)
    const res = await fetch(`/api/units/${unit.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kondisi: next, catatan }),
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json()
      alert(data.error ?? 'Gagal mengubah kondisi')
      return
    }
    router.refresh()
  }

  async function deleteUnit(unit: UnitRow) {
    if (!confirm(`Hapus unit ${unit.kode}?`)) return
    setLoading(true)
    const res = await fetch(`/api/units/${unit.id}`, { method: 'DELETE' })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json()
      alert(data.error ?? 'Gagal menghapus unit')
      return
    }
    router.refresh()
  }

  return (
    <div className="hud-panel p-[22px]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="hud-label text-[12px]" style={{ color: '#c3ccd6' }}>Daftar Unit</h2>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="hud-btn-ghost inline-flex items-center gap-2 px-3 py-2 text-[11px]"
        >
          <Plus className="h-3.5 w-3.5" />
          Tambah Unit
        </button>
      </div>

      {showAdd && (
        <div
          className="mb-4 flex flex-wrap items-end gap-2 p-3 hud-clip-sm"
          style={{ background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.25)' }}
        >
          <div className="min-w-0 flex-1">
            <label className="mb-1 block text-[11px]" style={{ color: '#b3bdc7' }}>Kode Unit Baru</label>
            <input
              value={newKode}
              onChange={(e) => setNewKode(e.target.value)}
              placeholder="RB_29, Ap-24, dst."
              className="hud-input w-full px-3 py-2 text-[13.5px]"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUnit() } }}
            />
          </div>
          <button
            type="button"
            disabled={loading || !newKode.trim()}
            onClick={addUnit}
            className="hud-btn-primary px-4 py-2 text-[11px] disabled:opacity-50"
          >
            Tambah
          </button>
          <button
            type="button"
            onClick={() => { setShowAdd(false); setNewKode(''); setError('') }}
            className="hud-btn-ghost px-3 py-2 text-[11px]"
          >
            Batal
          </button>
        </div>
      )}

      {error && (
        <p
          className="mb-3 flex items-center gap-1.5 px-3 py-2 text-[12.5px] hud-clip-sm"
          style={{ color: '#f87171', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}
        >
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}

      <div className="mb-3 flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((s) => {
          const active = filter === s.value
          return (
            <button
              key={s.value}
              type="button"
              onClick={() => setFilter(s.value)}
              className="hud-clip-sm px-3 py-1.5 text-[11.5px] transition"
              style={{
                color: active ? '#fff' : '#8a97a3',
                background: active ? 'rgba(92,132,255,0.18)' : 'transparent',
                border: `1px solid ${active ? 'rgba(92,132,255,0.45)' : 'rgba(99,102,241,0.16)'}`,
              }}
            >
              {s.label}
              <span className="ml-1.5 text-[10px]" style={{ color: active ? '#9bb3ff' : '#6b7785' }}>
                {counts[s.value]}
              </span>
            </button>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-[13px]" style={{ color: '#6b7785' }}>
          {initialUnits.length === 0 ? 'Belum ada unit. Klik "Tambah Unit" untuk menambah.' : 'Tidak ada unit pada filter ini'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(99,102,241,0.16)' }}>
                <th className="hud-label px-3 py-2.5 text-left text-[10px]" style={{ color: '#6b7785' }}>Kode</th>
                <th className="hud-label px-3 py-2.5 text-left text-[10px]" style={{ color: '#6b7785' }}>Status</th>
                <th className="hud-label px-3 py-2.5 text-left text-[10px]" style={{ color: '#6b7785' }}>Peminjam</th>
                <th className="hud-label px-3 py-2.5 text-left text-[10px]" style={{ color: '#6b7785' }}>Catatan</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr
                  key={u.id}
                  style={{
                    borderBottom: '1px solid rgba(99,102,241,0.08)',
                    background:
                      u.status === 'dipinjam' ? 'rgba(59,130,246,0.04)' :
                      u.status === 'rusak' ? 'rgba(239,68,68,0.04)' : 'transparent',
                  }}
                >
                  <td className="px-3 py-2.5">
                    <span
                      className="font-bold"
                      style={{
                        fontFamily: 'var(--font-orbitron), sans-serif',
                        fontSize: 13,
                        letterSpacing: 0.5,
                        color: u.status === 'tersedia' ? '#4ade80' : u.status === 'dipinjam' ? '#60a5fa' : '#f87171',
                      }}
                    >
                      {u.kode}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-[13px]">
                    <span style={{ color: u.status === 'tersedia' ? '#4ade80' : u.status === 'dipinjam' ? '#60a5fa' : '#f87171' }}>
                      ● {u.status === 'tersedia' ? 'Tersedia' : u.status === 'dipinjam' ? 'Dipinjam' : 'Rusak'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-[13px]" style={{ color: '#c3ccd6' }}>
                    {u.peminjaman ? (
                      <div>
                        <p>{u.peminjaman.user.name}</p>
                        <p className="text-[11px]" style={{ color: '#6b7785' }}>{u.peminjaman.user.kelas ?? '-'}</p>
                      </div>
                    ) : (
                      <span style={{ color: '#6b7785' }}>—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-[12px]" style={{ color: u.kondisi === 'rusak' ? '#fbbf24' : '#6b7785', maxWidth: 200 }}>
                    {u.catatan ?? '—'}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-1.5">
                      {u.status !== 'dipinjam' && (
                        <>
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => toggleKondisi(u)}
                            className="hud-clip-sm flex h-7 w-7 items-center justify-center"
                            style={{
                              color: u.kondisi === 'baik' ? '#fbbf24' : '#4ade80',
                              border: `1px solid ${u.kondisi === 'baik' ? 'rgba(234,179,8,0.3)' : 'rgba(34,197,94,0.3)'}`,
                            }}
                            title={u.kondisi === 'baik' ? 'Tandai Rusak' : 'Tandai Baik'}
                          >
                            {u.kondisi === 'baik' ? <Wrench className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => deleteUnit(u)}
                            className="hud-clip-sm flex h-7 w-7 items-center justify-center"
                            style={{ color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
                            title="Hapus Unit"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
