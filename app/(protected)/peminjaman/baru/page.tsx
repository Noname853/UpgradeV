'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { StockBadge } from '@/components/shared/StockBadge'
import { Plus, Trash2, ArrowLeft, Search, Clock, AlertTriangle, Users } from 'lucide-react'
import Link from 'next/link'

const JAM_BUKA = 7   // 07:00
const JAM_TUTUP = 17 // 17:00
const HARI_OPERASIONAL = [1, 2, 3, 4, 5, 6] // Senin–Sabtu

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
  kode: string
  nama: string
  kategori: string
  stok: number
  stokTersedia: number
}

interface Item {
  alatId: number
  alat: AlatOption | null
  jumlah: number
  keterangan: string
}

interface KelompokInfo {
  kelompok: string | null
  anggotaKelompok: string[]
}

export default function BuatPeminjamanPage() {
  const router = useRouter()
  const [items, setItems] = useState<Item[]>([{ alatId: 0, alat: null, jumlah: 1, keterangan: '' }])
  const [keperluan, setKeperluan] = useState('')
  const [tanggalBatas, setTanggalBatas] = useState('')
  const [catatan, setCatatan] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchResults, setSearchResults] = useState<AlatOption[]>([])
  const [searchIdx, setSearchIdx] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusWaktu, setStatusWaktu] = useState<ReturnType<typeof cekJamOperasional> | null>(null)
  const [kelompok, setKelompok] = useState<KelompokInfo | null>(null)

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
      const res = await fetch(`/api/alat?search=${encodeURIComponent(searchQuery)}&limit=10`)
      const data = await res.json()
      setSearchResults(data.data ?? [])
    }, 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  function selectAlat(idx: number, alat: AlatOption) {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, alatId: alat.id, alat } : item)))
    setSearchIdx(null)
    setSearchQuery('')
  }

  function addItem() {
    setItems((prev) => [...prev, { alatId: 0, alat: null, jumlah: 1, keterangan: '' }])
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!keperluan) { setError('Keperluan wajib diisi'); return }
    if (items.some((i) => !i.alatId)) { setError('Semua alat harus dipilih'); return }

    setLoading(true)
    const res = await fetch('/api/peminjaman', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keperluan,
        tanggalBatasKembali: tanggalBatas || null,
        catatan: catatan || null,
        items: items.map((i) => ({ alatId: i.alatId, jumlah: i.jumlah, keterangan: i.keterangan || null })),
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

  return (
    <div className="mx-auto max-w-[1120px]">
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
          <p className="mt-1 text-[13px]" style={{ color: '#8a97a3' }}>Ajukan permintaan peminjaman alat</p>
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
              Tolong sesuaikan waktu Hari dan Tanggal saat ini. Pengajuan hanya dapat dilakukan pada{' '}
              <strong>Senin–Sabtu, 07:00–17:00</strong>.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div
          className="grid items-start gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}
        >
          <div className="space-y-3.5 lg:col-span-2">
            {/* Items */}
            <div className="hud-panel p-[22px]">
              <h2 className="hud-label mb-4 text-[12px]" style={{ color: '#c3ccd6' }}>Alat yang Dipinjam</h2>
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 hud-clip-sm"
                    style={{ border: '1px solid rgba(99,102,241,0.16)' }}
                  >
                    {/* Alat search */}
                    <div className="relative mb-2.5">
                      {item.alat ? (
                        <div
                          className="flex items-center justify-between gap-2 px-3 py-2 hud-clip-sm"
                          style={{ background: 'rgba(255,255,255,0.03)' }}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[14px] font-semibold" style={{ color: '#fff' }}>{item.alat.nama}</p>
                            <p className="text-[12px]" style={{ color: '#6b7785' }}>{item.alat.kode}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <StockBadge stok={item.alat.stok} stokTersedia={item.alat.stokTersedia} />
                            <button
                              type="button"
                              onClick={() => setItems((prev) => prev.map((it, i) => i === idx ? { ...it, alatId: 0, alat: null } : it))}
                              className="flex h-8 w-8 items-center justify-center text-[18px]"
                              style={{ color: '#6b7785' }}
                              aria-label="Hapus pilihan alat"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: '#5d717d' }} />
                            <input
                              placeholder="Cari alat untuk ditambahkan..."
                              value={searchIdx === idx ? searchQuery : ''}
                              onFocus={() => setSearchIdx(idx)}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="hud-input w-full py-2.5 pl-9 pr-3 text-[14px]"
                            />
                          </div>
                          {searchIdx === idx && searchResults.length > 0 && (
                            <div
                              className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto hud-clip-sm"
                              style={{
                                background: '#0d1117',
                                border: '1px solid rgba(99,102,241,0.3)',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                              }}
                            >
                              {searchResults.map((a) => (
                                <button
                                  key={a.id}
                                  type="button"
                                  onClick={() => selectAlat(idx, a)}
                                  className="flex w-full items-center justify-between gap-2 px-3 py-3 text-left text-[14px] transition"
                                  style={{ color: '#e8edf2' }}
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate" style={{ color: '#fff' }}>{a.nama}</p>
                                    <p className="text-[12px]" style={{ color: '#6b7785' }}>{a.kode}</p>
                                  </div>
                                  <StockBadge stok={a.stok} stokTersedia={a.stokTersedia} />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="w-20 sm:w-24">
                        <label className="mb-1.5 block text-[12px]" style={{ color: '#6b7785' }}>Jumlah</label>
                        <input
                          type="number"
                          min="1"
                          max={item.alat?.stokTersedia ?? 99}
                          value={item.jumlah}
                          onChange={(e) => setItems((prev) => prev.map((it, i) => i === idx ? { ...it, jumlah: parseInt(e.target.value) || 1 } : it))}
                          className="hud-input w-full px-3 py-2.5 text-[14px]"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <label className="mb-1.5 block text-[12px]" style={{ color: '#6b7785' }}>Keterangan</label>
                        <input
                          placeholder="Opsional"
                          value={item.keterangan}
                          onChange={(e) => setItems((prev) => prev.map((it, i) => i === idx ? { ...it, keterangan: e.target.value } : it))}
                          className="hud-input w-full px-3 py-2.5 text-[14px]"
                        />
                      </div>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="flex h-10 w-10 shrink-0 items-center justify-center hud-clip-sm"
                          style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
                          aria-label="Hapus item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addItem}
                className="mt-3.5 inline-flex items-center gap-2 text-[13.5px] font-semibold"
                style={{ color: '#5c84ff' }}
              >
                <Plus className="h-4 w-4" />
                Tambah Alat
              </button>
            </div>
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
                  <input
                    type="date"
                    value={tanggalBatas}
                    onChange={(e) => setTanggalBatas(e.target.value)}
                    className="hud-input w-full px-3 py-2.5 text-[14px]"
                    style={{ color: '#c3ccd6' }}
                  />
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
              disabled={loading || diluarJam}
              className="hud-btn-primary w-full px-[18px] py-3 text-[12px] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? 'MENGAJUKAN...' : diluarJam ? 'DI LUAR JAM OPERASIONAL' : 'AJUKAN PEMINJAMAN'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
