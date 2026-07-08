'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, ArrowLeft, Search, Clock, AlertTriangle, Users, Check, ScanLine, Lock } from 'lucide-react'
import Link from 'next/link'
import { ScanQrDialog, type ScannedUnit } from '@/components/peminjaman/ScanQrDialog'

const JAM_BUKA = 6
const JAM_TUTUP = 17
const HARI_OPERASIONAL = [1, 2, 3, 4, 5, 6]
const NAMA_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

function cekJamOperasional() {
  const now = new Date()
  const hari = now.getDay()
  const jam = now.getHours()
  const menit = now.getMinutes()
  const waktuMenit = jam * 60 + menit
  const boleh =
    HARI_OPERASIONAL.includes(hari) &&
    waktuMenit >= JAM_BUKA * 60 &&
    waktuMenit < JAM_TUTUP * 60
  return {
    boleh,
    waktuSekarang: `${String(jam).padStart(2, '0')}:${String(menit).padStart(2, '0')}`,
    hariSekarang: NAMA_HARI[hari],
  }
}

interface AlatOption {
  id: number
  nama: string
  kategori: string
  totalUnit: number
  tersedia: number
  dipinjam: number
  rusak: number
}

interface UnitOption {
  id: number
  kode: string
  kondisi: 'baik' | 'rusak'
  status: 'tersedia' | 'dipinjam' | 'rusak'
}

interface Item {
  alat: AlatOption
  units: UnitOption[]
  selectedUnitIds: number[]
  loadingUnits: boolean
  keterangan: string
  // Unit hasil scan QR terkunci: siswa tidak bisa mengganti unit lewat grid.
  scanned: boolean
}

interface KelompokInfo {
  kelompok: string | null
  anggotaKelompok: string[]
}

export default function BuatPeminjamanPage() {
  const router = useRouter()
  const [items, setItems] = useState<Item[]>([])
  const [keperluan, setKeperluan] = useState('')
  const [catatan, setCatatan] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<AlatOption[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusWaktu, setStatusWaktu] = useState<ReturnType<typeof cekJamOperasional> | null>(null)
  const [kelompok, setKelompok] = useState<KelompokInfo | null>(null)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const [scanOpen, setScanOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!searchOpen || !searchQuery) {
      setDropdownPos(null)
      return
    }
    function updatePos() {
      const el = searchInputRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      setDropdownPos({ top: r.bottom + 4, left: r.left, width: r.width })
    }
    updatePos()
    window.addEventListener('scroll', updatePos, true)
    window.addEventListener('resize', updatePos)
    return () => {
      window.removeEventListener('scroll', updatePos, true)
      window.removeEventListener('resize', updatePos)
    }
  }, [searchOpen, searchQuery])

  useEffect(() => {
    if (!searchOpen) return
    function onClick(e: MouseEvent) {
      const t = e.target as HTMLElement
      if (searchInputRef.current?.contains(t)) return
      if (t.closest('[data-search-dropdown]')) return
      setSearchOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [searchOpen])

  useEffect(() => {
    setStatusWaktu(cekJamOperasional())
    const interval = setInterval(() => setStatusWaktu(cekJamOperasional()), 60_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    fetch('/api/profil').then((r) => r.json()).then((d) => {
      if (d.kelompok || d.anggotaKelompok?.length > 0) {
        setKelompok({ kelompok: d.kelompok, anggotaKelompok: d.anggotaKelompok ?? [] })
      }
    })
  }, [])

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!searchQuery) {
        setSearchResults([])
        return
      }
      setSearching(true)
      const res = await fetch(`/api/alat?search=${encodeURIComponent(searchQuery)}&limit=10`)
      const data = await res.json()
      setSearching(false)
      setSearchResults(data.data ?? [])
    }, 250)
    return () => clearTimeout(t)
  }, [searchQuery])

  async function pickAlat(alat: AlatOption) {
    if (items.some((i) => i.alat.id === alat.id)) {
      setError('Alat sudah ditambahkan')
      return
    }
    setSearchOpen(false)
    setSearchQuery('')
    setError('')
    const newItem: Item = { alat, units: [], selectedUnitIds: [], loadingUnits: true, keterangan: '', scanned: false }
    setItems((prev) => [...prev, newItem])
    const res = await fetch(`/api/units?alatId=${alat.id}`)
    const data = await res.json()
    setItems((prev) =>
      prev.map((it) => (it.alat.id === alat.id ? { ...it, units: data.data ?? [], loadingUnits: false } : it)),
    )
  }

  // Maks 1 unit per alat: memilih unit lain menggantikan pilihan sebelumnya.
  // Unit hasil scan QR tidak bisa diubah lewat grid.
  function toggleUnit(alatId: number, unitId: number) {
    setItems((prev) =>
      prev.map((it) => {
        if (it.alat.id !== alatId || it.scanned) return it
        const has = it.selectedUnitIds.includes(unitId)
        return { ...it, selectedUnitIds: has ? [] : [unitId] }
      }),
    )
  }

  function setKeteranganFor(alatId: number, value: string) {
    setItems((prev) => prev.map((it) => (it.alat.id === alatId ? { ...it, keterangan: value } : it)))
  }

  function removeItem(alatId: number) {
    setItems((prev) => prev.filter((it) => it.alat.id !== alatId))
  }

  // Hasil scan QR: unit sudah divalidasi server (ada + tersedia). Tinggal
  // masukkan ke keranjang — gabung ke kartu alat yang sudah ada, atau buat
  // kartu baru lalu muat daftar unitnya seperti pickAlat.
  function addScannedUnit(unit: ScannedUnit): 'added' | 'duplicate' | 'limit' {
    const existing = items.find((it) => it.alat.id === unit.alat.id)
    if (existing) {
      if (existing.selectedUnitIds.includes(unit.id)) {
        // Unit yang sama di-scan ulang: kunci pilihannya (scan = pegang fisik).
        setItems((prev) =>
          prev.map((it) => (it.alat.id === unit.alat.id ? { ...it, scanned: true } : it)),
        )
        return 'duplicate'
      }
      // Maks 1 unit per alat: alat ini sudah punya unit terpilih.
      if (existing.selectedUnitIds.length > 0) return 'limit'
      setItems((prev) =>
        prev.map((it) =>
          it.alat.id === unit.alat.id ? { ...it, selectedUnitIds: [unit.id], scanned: true } : it,
        ),
      )
      return 'added'
    }

    setError('')
    const newItem: Item = {
      alat: unit.alat,
      units: [],
      selectedUnitIds: [unit.id],
      loadingUnits: true,
      keterangan: '',
      scanned: true,
    }
    setItems((prev) => [...prev, newItem])
    fetch(`/api/units?alatId=${unit.alat.id}`)
      .then((r) => r.json())
      .then((data) => {
        setItems((prev) =>
          prev.map((it) =>
            it.alat.id === unit.alat.id ? { ...it, units: data.data ?? [], loadingUnits: false } : it,
          ),
        )
      })
      .catch(() => {
        setItems((prev) =>
          prev.map((it) => (it.alat.id === unit.alat.id ? { ...it, loadingUnits: false } : it)),
        )
      })
    return 'added'
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!keperluan.trim()) { setError('Keperluan wajib diisi'); return }
    if (items.length === 0) { setError('Pilih minimal 1 alat'); return }
    const empty = items.find((it) => it.selectedUnitIds.length === 0)
    if (empty) { setError(`Pilih minimal 1 unit untuk ${empty.alat.nama}`); return }

    setLoading(true)
    const res = await fetch('/api/peminjaman', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keperluan,
        catatan: catatan || null,
        items: items.map((it) => ({
          unitIds: it.selectedUnitIds,
          keterangan: it.keterangan || null,
        })),
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Gagal membuat peminjaman')
      setLoading(false)
    } else {
      router.push(`/peminjaman/${data.id}`)
    }
  }

  const diluarJam = statusWaktu !== null && !statusWaktu.boleh
  const totalUnitDipilih = items.reduce((sum, it) => sum + it.selectedUnitIds.length, 0)

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3 hud-rise">
        <Link
          href="/peminjaman"
          className="flex h-[38px] w-[38px] items-center justify-center hud-clip-sm"
          style={{ color: '#8a97a3', border: '1px solid rgba(99,102,241,0.25)' }}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="hud-title" style={{ fontSize: 22 }}>Buat Peminjaman</h1>
          <p className="mt-1 text-[13px]" style={{ color: '#8a97a3' }}>Pilih alat lalu pilih unit spesifik yang ingin dipinjam</p>
        </div>
        {statusWaktu && (
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] hud-clip-sm"
            style={{ color: '#8a97a3', border: '1px solid rgba(99,102,241,0.2)' }}
          >
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{
                background: statusWaktu.boleh ? '#22c55e' : '#ef4444',
                boxShadow: `0 0 8px ${statusWaktu.boleh ? 'rgba(34,197,94,0.7)' : 'rgba(239,68,68,0.7)'}`,
              }}
            />
            <Clock className="h-3.5 w-3.5" />
            {statusWaktu.hariSekarang}, {statusWaktu.waktuSekarang}
          </div>
        )}
      </div>

      {diluarJam && (
        <div
          className="mb-4 flex items-start gap-3 px-4 py-4 hud-clip-md"
          style={{
            background: 'linear-gradient(160deg, rgba(234,179,8,0.09), rgba(255,255,255,0.01))',
            border: '1px solid rgba(234,179,8,0.3)',
          }}
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" style={{ color: '#eab308' }} />
          <div>
            <p className="text-[14px] font-semibold" style={{ color: '#fde68a' }}>
              Pengajuan pinjaman tidak tersedia saat ini
            </p>
            <p className="mt-0.5 text-[13px]" style={{ color: '#eab308' }}>
              Pengajuan hanya dapat dilakukan pada <strong>Senin–Sabtu, 06:00–17:00</strong>.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid items-start gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          <div className="space-y-3.5 lg:col-span-2">
            {/* Search alat */}
            <div className="hud-panel p-[22px]">
              <h2 className="hud-label mb-3 text-[12px]" style={{ color: '#c3ccd6' }}>Tambah Alat</h2>
              <div className="flex gap-2.5">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: '#5d717d' }} />
                  <input
                    ref={searchInputRef}
                    placeholder="Cari nama alat (misal: Router, Switch)..."
                    value={searchQuery}
                    onFocus={() => setSearchOpen(true)}
                    onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true) }}
                    className="hud-input w-full py-2.5 pl-9 pr-3 text-[14px]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setScanOpen(true)}
                  className="hud-clip-sm inline-flex shrink-0 items-center gap-2 px-3.5 text-[13px] font-semibold"
                  style={{
                    color: '#5c84ff',
                    border: '1px solid rgba(99,102,241,0.35)',
                    background: 'rgba(99,102,241,0.08)',
                  }}
                  aria-label="Scan QR unit"
                >
                  <ScanLine className="h-4 w-4" />
                  <span className="hidden sm:inline">Scan QR</span>
                </button>
                {searchOpen && searchQuery && dropdownPos && typeof window !== 'undefined' && createPortal(
                  <div
                    data-search-dropdown
                    className="max-h-72 overflow-y-auto hud-clip-sm"
                    style={{
                      position: 'fixed',
                      top: dropdownPos.top,
                      left: dropdownPos.left,
                      width: dropdownPos.width,
                      zIndex: 9999,
                      background: '#0d1117',
                      border: '1px solid rgba(99,102,241,0.3)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    }}
                  >
                    {searching && (
                      <p className="px-3 py-3 text-[13px]" style={{ color: '#6b7785' }}>Mencari...</p>
                    )}
                    {!searching && searchResults.length === 0 && (
                      <p className="px-3 py-3 text-[13px]" style={{ color: '#6b7785' }}>Tidak ada alat ditemukan</p>
                    )}
                    {searchResults.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => pickAlat(a)}
                        className="flex w-full items-center justify-between gap-2 px-3 py-3 text-left text-[14px] transition hover:bg-white/5"
                        style={{ color: '#e8edf2' }}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate" style={{ color: '#fff' }}>{a.nama}</p>
                          <p className="text-[12px]" style={{ color: '#6b7785' }}>{a.kategori}</p>
                        </div>
                        <span
                          className="hud-clip-sm shrink-0 px-2 py-0.5 text-[11px] font-semibold"
                          style={{
                            color: a.tersedia > 0 ? '#4ade80' : '#f87171',
                            background: a.tersedia > 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                            border: `1px solid ${a.tersedia > 0 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                          }}
                        >
                          {a.tersedia} tersedia
                        </span>
                      </button>
                    ))}
                  </div>,
                  document.body,
                )}
              </div>
            </div>

            {/* Selected alats with unit picker */}
            {items.map((item) => (
              <div key={item.alat.id} className="hud-panel p-[22px]">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[15px] font-bold" style={{ color: '#fff' }}>{item.alat.nama}</p>
                    <p className="mt-0.5 text-[12px]" style={{ color: '#6b7785' }}>
                      {item.alat.kategori} · {item.alat.tersedia} tersedia
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.alat.id)}
                    className="hud-clip-sm flex h-9 w-9 shrink-0 items-center justify-center"
                    style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
                    aria-label="Hapus alat"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div
                  className="p-3"
                  style={{
                    border: '1px solid rgba(34,197,94,0.3)',
                    background: 'rgba(34,197,94,0.03)',
                  }}
                >
                  {item.scanned ? (
                    <p className="mb-2.5 flex items-center gap-1.5 text-[12px]" style={{ color: '#4ade80' }}>
                      <Lock className="h-3.5 w-3.5 shrink-0" />
                      Unit hasil scan QR — pilihan terkunci, tidak bisa diubah.
                    </p>
                  ) : (
                    <p className="mb-2.5 text-[12px]" style={{ color: '#8a97a3' }}>
                      Pilih 1 unit yang ingin dipinjam (maksimal 1 unit per alat):
                    </p>
                  )}
                  {item.loadingUnits ? (
                    <p className="py-4 text-center text-[13px]" style={{ color: '#6b7785' }}>Memuat unit...</p>
                  ) : item.units.length === 0 ? (
                    <p className="py-4 text-center text-[13px]" style={{ color: '#6b7785' }}>Belum ada unit untuk alat ini</p>
                  ) : (
                    <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
                      {item.units.map((u) => {
                        const selected = item.selectedUnitIds.includes(u.id)
                        const disabled = u.status !== 'tersedia' || item.scanned
                        return (
                          <button
                            key={u.id}
                            type="button"
                            disabled={disabled}
                            onClick={() => toggleUnit(item.alat.id, u.id)}
                            className="hud-clip-sm px-3 py-2.5 text-center transition disabled:cursor-not-allowed"
                            style={{
                              border: `1px solid ${selected ? '#22c55e' : disabled ? 'rgba(99,102,241,0.16)' : 'rgba(99,102,241,0.25)'}`,
                              background: selected ? 'rgba(34,197,94,0.12)' : 'transparent',
                              opacity: selected ? 1 : disabled ? 0.4 : 1,
                            }}
                          >
                            <p
                              className="text-[13px] font-bold"
                              style={{
                                fontFamily: 'var(--font-orbitron), sans-serif',
                                color: selected ? '#22c55e' : u.status === 'tersedia' ? '#4ade80' : u.status === 'rusak' ? '#f87171' : '#6b7785',
                              }}
                            >
                              {u.kode}
                            </p>
                            <p className="mt-1 text-[10.5px]" style={{ color: selected ? '#22c55e' : '#6b7785' }}>
                              {selected ? <span className="inline-flex items-center gap-0.5"><Check className="h-2.5 w-2.5" />Dipilih</span> : u.status === 'tersedia' ? 'Tersedia' : u.status === 'rusak' ? 'Rusak' : 'Dipinjam'}
                            </p>
                          </button>
                        )
                      })}
                    </div>
                  )}
                  {item.selectedUnitIds.length > 0 && (
                    <p className="mt-3 text-[12.5px]" style={{ color: '#e8edf2' }}>
                      <b>{item.selectedUnitIds.length} unit dipilih:</b>{' '}
                      <span style={{ color: '#22c55e' }}>
                        {item.units
                          .filter((u) => item.selectedUnitIds.includes(u.id))
                          .map((u) => u.kode)
                          .join(', ')}
                      </span>
                    </p>
                  )}
                </div>

                <div className="mt-3">
                  <label className="mb-1 block text-[12px]" style={{ color: '#6b7785' }}>Keterangan (opsional)</label>
                  <input
                    value={item.keterangan}
                    onChange={(e) => setKeteranganFor(item.alat.id, e.target.value)}
                    placeholder="Misal: untuk konfigurasi VLAN"
                    className="hud-input w-full px-3 py-2 text-[13px]"
                  />
                </div>
              </div>
            ))}

            {items.length > 0 && (
              <button
                type="button"
                onClick={() => { setSearchOpen(true); setSearchQuery('') }}
                className="inline-flex items-center gap-2 text-[13.5px] font-semibold"
                style={{ color: '#5c84ff' }}
              >
                <Plus className="h-4 w-4" />
                Tambah Alat Lain
              </button>
            )}
          </div>

          <div className="space-y-3.5">
            {kelompok && (
              <div className="hud-panel p-[18px]">
                <div className="mb-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" style={{ color: '#5c84ff' }} />
                    <h2 className="hud-label text-[11px]" style={{ color: '#c3ccd6' }}>Kelompok</h2>
                  </div>
                  <Link href="/profil" className="text-[12px] font-semibold" style={{ color: '#5c84ff' }}>
                    Edit →
                  </Link>
                </div>
                {kelompok.kelompok && (
                  <p className="mb-2 text-[14px] font-semibold" style={{ color: '#e8edf2' }}>{kelompok.kelompok}</p>
                )}
                {kelompok.anggotaKelompok.length > 0 && (
                  <ul className="flex flex-col gap-1.5">
                    {kelompok.anggotaKelompok.map((nama, i) => (
                      <li key={i} className="text-[12.5px]" style={{ color: '#8a97a3' }}>• {nama}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="hud-panel p-[18px]">
              <h2 className="hud-label mb-3.5 text-[11px]" style={{ color: '#c3ccd6' }}>Informasi Peminjaman</h2>
              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-[13px]" style={{ color: '#b3bdc7' }}>Keperluan *</label>
                  <input
                    value={keperluan}
                    onChange={(e) => setKeperluan(e.target.value)}
                    placeholder="Praktikum jaringan..."
                    className="hud-input w-full px-3 py-2.5 text-[14px]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px]" style={{ color: '#b3bdc7' }}>Batas Kembali</label>
                  <div
                    className="hud-input flex w-full items-center gap-2 px-3 py-2.5 text-[14px]"
                    style={{ color: '#c3ccd6' }}
                  >
                    <Clock size={15} style={{ color: '#8b98a5' }} />
                    <span>Hari ini pukul {String(JAM_TUTUP).padStart(2, '0')}:00</span>
                  </div>
                  <p className="mt-1 text-[12px]" style={{ color: '#8b98a5' }}>
                    Alat wajib dikembalikan paling lambat pukul {String(JAM_TUTUP).padStart(2, '0')}:00 di hari yang sama.
                  </p>
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px]" style={{ color: '#b3bdc7' }}>Catatan</label>
                  <textarea
                    rows={3}
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    placeholder="Catatan tambahan..."
                    className="hud-input w-full resize-y px-3 py-2.5 text-[14px]"
                  />
                </div>
              </div>
            </div>

            {items.length > 0 && totalUnitDipilih > 0 && (
              <div
                className="hud-panel p-[18px]"
                style={{ border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.03)' }}
              >
                <p className="hud-label mb-2 text-[11px]" style={{ color: '#4ade80' }}>RINGKASAN</p>
                <ul className="space-y-1.5">
                  {items.map((it) => (
                    <li key={it.alat.id} className="text-[13px]" style={{ color: '#e8edf2' }}>
                      <p className="font-semibold">{it.alat.nama}</p>
                      <p className="ml-3 text-[12px]" style={{ color: '#6b7785' }}>
                        Unit: <span style={{ color: '#22c55e' }}>
                          {it.units
                            .filter((u) => it.selectedUnitIds.includes(u.id))
                            .map((u) => u.kode)
                            .join(', ') || '(belum dipilih)'}
                        </span>
                      </p>
                    </li>
                  ))}
                </ul>
                <div className="mt-2.5 border-t pt-2.5 text-[12.5px]" style={{ borderColor: 'rgba(99,102,241,0.16)', color: '#c3ccd6' }}>
                  Total: <b style={{ color: '#fff' }}>{totalUnitDipilih} unit</b> dari {items.length} jenis alat
                </div>
              </div>
            )}

            {error && (
              <p
                className="px-3 py-2 text-[13px] hud-clip-sm"
                style={{
                  color: '#fca5a5',
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || diluarJam || items.length === 0 || totalUnitDipilih === 0}
              className="hud-btn-primary w-full px-[18px] py-3 text-[12px] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? 'MENGAJUKAN...' : diluarJam ? 'DI LUAR JAM OPERASIONAL' : 'AJUKAN PEMINJAMAN'}
            </button>
          </div>
        </div>
      </form>

      <ScanQrDialog
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onUnitScanned={addScannedUnit}
        totalDipilih={totalUnitDipilih}
      />
    </div>
  )
}
