'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Plus, Wrench, CheckCircle2, Trash2, AlertCircle, X, SquarePen } from 'lucide-react'

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

  // Bulk select state
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [bulkConfirm, setBulkConfirm] = useState<'rusak' | 'baik' | null>(null)

  const filtered = filter === 'all' ? initialUnits : initialUnits.filter((u) => u.status === filter)
  const counts = {
    all: initialUnits.length,
    tersedia: initialUnits.filter((u) => u.status === 'tersedia').length,
    dipinjam: initialUnits.filter((u) => u.status === 'dipinjam').length,
    rusak: initialUnits.filter((u) => u.status === 'rusak').length,
  }

  // Unit yang bisa dicentang (tidak sedang dipinjam)
  const selectableIds = filtered.filter((u) => u.status !== 'dipinjam').map((u) => u.id)
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id))
  const someSelected = selectableIds.some((id) => selected.has(id))

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev)
        selectableIds.forEach((id) => next.delete(id))
        return next
      })
    } else {
      setSelected((prev) => new Set([...prev, ...selectableIds]))
    }
  }

  function clearSelection() {
    setSelected(new Set())
  }

  const selectedUnits = initialUnits.filter((u) => selected.has(u.id))
  const selectedCount = selected.size

  async function executeBulk(kondisi: 'baik' | 'rusak') {
    setBulkConfirm(null)
    setLoading(true)
    const res = await fetch('/api/units/bulk', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [...selected], kondisi }),
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Gagal mengubah kondisi unit')
      return
    }
    setSelected(new Set())
    router.refresh()
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
    // Kembali "baik" = kerusakan selesai: catatan kerusakannya ikut dibersihkan
    // (riwayat kerusakan tetap tersimpan di detail peminjaman).
    const catatan =
      next === 'rusak' ? prompt('Catatan kerusakan (opsional):') ?? unit.catatan : null
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

  async function editCatatan(unit: UnitRow) {
    const input = prompt('Catatan unit (kosongkan untuk menghapus):', unit.catatan ?? '')
    if (input === null) return // batal
    setLoading(true)
    const res = await fetch(`/api/units/${unit.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ catatan: input.trim() }),
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json()
      alert(data.error ?? 'Gagal mengubah catatan')
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
      {/* Bulk confirm dialog */}
      {bulkConfirm && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)' }}
        >
          <div
            className="hud-clip-md p-7 w-full max-w-md mx-4"
            style={{ background: '#0d1520', border: `1px solid ${bulkConfirm === 'rusak' ? 'rgba(239,68,68,0.35)' : 'rgba(34,197,94,0.35)'}` }}
          >
            <div
              className="hud-clip-sm mb-4 flex h-11 w-11 items-center justify-center text-xl"
              style={{
                background: bulkConfirm === 'rusak' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                border: `1px solid ${bulkConfirm === 'rusak' ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
              }}
            >
              {bulkConfirm === 'rusak' ? '⚠' : '✓'}
            </div>
            <p className="hud-label mb-2 text-[13px]" style={{ color: '#fff' }}>
              Konfirmasi Tandai {bulkConfirm === 'rusak' ? 'Rusak' : 'Baik'}
            </p>
            <p className="mb-3 text-[13.5px] leading-relaxed" style={{ color: '#8a97a3' }}>
              <span style={{ color: bulkConfirm === 'rusak' ? '#f87171' : '#4ade80', fontWeight: 700 }}>
                {selectedCount} unit
              </span>{' '}
              berikut akan ditandai sebagai{' '}
              <span style={{ color: bulkConfirm === 'rusak' ? '#f87171' : '#4ade80', fontWeight: 700 }}>
                {bulkConfirm}
              </span>:
            </p>
            <div className="mb-4 flex flex-wrap gap-1.5">
              {selectedUnits.map((u) => (
                <span
                  key={u.id}
                  className="hud-clip-sm px-2 py-0.5 text-[11px]"
                  style={{
                    fontFamily: 'var(--font-orbitron), sans-serif',
                    letterSpacing: '0.5px',
                    color: bulkConfirm === 'rusak' ? '#f87171' : '#4ade80',
                    background: bulkConfirm === 'rusak' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.08)',
                    border: `1px solid ${bulkConfirm === 'rusak' ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
                  }}
                >
                  {u.kode}
                </span>
              ))}
            </div>
            <p className="mb-5 text-[12px]" style={{ color: '#6b7785' }}>
              Unit yang sedang dipinjam otomatis dilewati. Perubahan bisa dibatalkan kapan saja.
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setBulkConfirm(null)}
                className="hud-clip-sm px-4 py-2 text-[11px]"
                style={{ color: '#8a97a3', border: '1px solid rgba(99,102,241,0.25)' }}
              >
                Batal
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => executeBulk(bulkConfirm)}
                className="hud-clip-sm px-5 py-2 text-[11px] font-semibold disabled:opacity-50"
                style={{
                  color: bulkConfirm === 'rusak' ? '#f87171' : '#4ade80',
                  background: bulkConfirm === 'rusak' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.08)',
                  border: `1px solid ${bulkConfirm === 'rusak' ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
                  fontFamily: 'var(--font-orbitron), sans-serif',
                  letterSpacing: '0.5px',
                }}
              >
                Ya, Tandai {bulkConfirm === 'rusak' ? 'Rusak' : 'Baik'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

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

      {/* Bulk action bar */}
      {someSelected && (
        <div
          className="mb-3 flex flex-wrap items-center gap-2 px-3 py-2.5 hud-clip-sm"
          style={{ background: 'rgba(92,132,255,0.08)', border: '1px solid rgba(92,132,255,0.38)' }}
        >
          <span className="text-[12px] font-semibold" style={{ color: '#9bb3ff', fontFamily: 'var(--font-orbitron), sans-serif', letterSpacing: '0.5px', fontSize: 10 }}>
            {selectedCount} DIPILIH
          </span>
          <button
            type="button"
            disabled={loading}
            onClick={() => setBulkConfirm('rusak')}
            className="hud-clip-sm inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50"
            style={{ color: '#f87171', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            <Wrench className="h-3 w-3" />
            Tandai Rusak
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => setBulkConfirm('baik')}
            className="hud-clip-sm inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50"
            style={{ color: '#4ade80', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)' }}
          >
            <CheckCircle2 className="h-3 w-3" />
            Tandai Baik
          </button>
          <button
            type="button"
            onClick={clearSelection}
            className="hud-clip-sm ml-auto inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px]"
            style={{ color: '#6b7785', border: '1px solid rgba(99,102,241,0.2)' }}
          >
            <X className="h-3 w-3" />
            Batal
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-[13px]" style={{ color: '#6b7785' }}>
          {initialUnits.length === 0 ? 'Belum ada unit. Klik "Tambah Unit" untuk menambah.' : 'Tidak ada unit pada filter ini'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(99,102,241,0.16)' }}>
                <th className="px-3 py-2.5" style={{ width: 36 }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected }}
                    onChange={toggleSelectAll}
                    className="cursor-pointer"
                    style={{ accentColor: '#818cf8', width: 14, height: 14 }}
                    title="Pilih semua"
                  />
                </th>
                <th className="hud-label px-3 py-2.5 text-left text-[10px]" style={{ color: '#6b7785' }}>Kode</th>
                <th className="hud-label px-3 py-2.5 text-left text-[10px]" style={{ color: '#6b7785' }}>Status</th>
                <th className="hud-label px-3 py-2.5 text-left text-[10px]" style={{ color: '#6b7785' }}>Peminjam</th>
                <th className="hud-label px-3 py-2.5 text-left text-[10px]" style={{ color: '#6b7785' }}>Catatan</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const isSelectable = u.status !== 'dipinjam'
                const isSelected = selected.has(u.id)
                return (
                  <tr
                    key={u.id}
                    style={{
                      borderBottom: '1px solid rgba(99,102,241,0.08)',
                      background: isSelected
                        ? 'rgba(92,132,255,0.07)'
                        : u.status === 'dipinjam' ? 'rgba(59,130,246,0.04)'
                        : u.status === 'rusak' ? 'rgba(239,68,68,0.04)' : 'transparent',
                      opacity: u.status === 'dipinjam' ? 0.65 : 1,
                    }}
                  >
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={!isSelectable}
                        onChange={() => isSelectable && toggleSelect(u.id)}
                        className={isSelectable ? 'cursor-pointer' : 'cursor-not-allowed opacity-30'}
                        style={{ accentColor: '#818cf8', width: 14, height: 14 }}
                      />
                    </td>
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
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => editCatatan(u)}
                          className="hud-clip-sm flex h-7 w-7 items-center justify-center"
                          style={{ color: '#5c84ff', border: '1px solid rgba(92,132,255,0.3)' }}
                          title="Ubah Catatan"
                        >
                          <SquarePen className="h-3.5 w-3.5" />
                        </button>
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
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
