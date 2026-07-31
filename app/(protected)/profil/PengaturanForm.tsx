'use client'

import { useState } from 'react'

interface Initial {
  jamBuka: number
  jamTutup: number
  maxUnitSiswa: number
  maxHari: number
  verifikasiOtomatis: boolean
  peringatanKeterlambatan: boolean
  bolehMultiUnit: boolean
}

function Toggle({ on, onToggle, warna = '#22c55e' }: { on: boolean; onToggle: () => void; warna?: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      className="relative shrink-0"
      style={{
        width: 52,
        height: 30,
        borderRadius: 999,
        border: `1px solid ${on ? warna : 'rgba(99,102,241,0.35)'}55`,
        background: on ? `${warna}33` : 'rgba(255,255,255,0.06)',
        transition: 'background-color .2s',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: 3,
          width: 24,
          height: 24,
          borderRadius: 999,
          background: on ? warna : '#6b7785',
          transform: on ? 'translateX(22px)' : 'translateX(0)',
          transition: 'transform .2s, background-color .2s',
          boxShadow: on ? `0 0 10px ${warna}99` : 'none',
        }}
      />
    </button>
  )
}

// Stepper angka dengan tombol −/+ (spin button). Memudahkan atur nilai di HP.
function Stepper({
  value,
  setValue,
  min,
  max,
}: {
  value: number
  setValue: (n: number) => void
  min: number
  max: number
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n))
  const btnCls =
    'flex h-10 w-10 shrink-0 items-center justify-center hud-clip-sm text-[20px] font-bold leading-none disabled:opacity-40'
  const btnStyle = {
    color: '#c3ccd6',
    border: '1px solid rgba(99,102,241,0.3)',
    background: 'rgba(255,255,255,0.03)',
  }
  return (
    <div className="flex items-stretch gap-2">
      <button
        type="button"
        onClick={() => setValue(clamp(value - 1))}
        disabled={value <= min}
        className={btnCls}
        style={btnStyle}
        aria-label="Kurangi"
      >
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(e) => setValue(clamp(Number(e.target.value) || min))}
        className="hud-input w-full min-w-0 px-2 py-2 text-center text-sm"
        style={{ colorScheme: 'dark' }}
      />
      <button
        type="button"
        onClick={() => setValue(clamp(value + 1))}
        disabled={value >= max}
        className={btnCls}
        style={btnStyle}
        aria-label="Tambah"
      >
        +
      </button>
    </div>
  )
}

// Panel Pengaturan Sistem (admin): jam operasional, aturan peminjaman,
// verifikasi otomatis & peringatan keterlambatan. Tersambung ke /api/pengaturan.
export function PengaturanForm({ initial }: { initial: Initial }) {
  const [jamBuka, setJamBuka] = useState(initial.jamBuka)
  const [jamTutup, setJamTutup] = useState(initial.jamTutup)
  const [maxUnit, setMaxUnit] = useState(initial.maxUnitSiswa)
  const [maxHari, setMaxHari] = useState(initial.maxHari)
  const [autoVerif, setAutoVerif] = useState(initial.verifikasiOtomatis)
  const [peringatan, setPeringatan] = useState(initial.peringatanKeterlambatan)
  const [multiUnit, setMultiUnit] = useState(initial.bolehMultiUnit)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const inputCls = 'hud-input w-full px-3 py-2 text-sm'
  const jam2 = (h: number) => `${String(h).padStart(2, '0')}:00`
  // Input time memberi "HH:MM"; backend simpan per jam → ambil jam-nya saja.
  const parseJam = (v: string) => Math.min(23, Math.max(0, parseInt(v.split(':')[0], 10) || 0))

  async function simpan() {
    setError('')
    setSaved(false)
    if (jamTutup <= jamBuka) {
      setError('Jam tutup harus lebih besar dari jam buka')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/pengaturan', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jamBuka,
          jamTutup,
          maxUnitSiswa: maxUnit,
          maxHari,
          verifikasiOtomatis: autoVerif,
          peringatanKeterlambatan: peringatan,
          bolehMultiUnit: multiUnit,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? 'Gagal menyimpan')
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch {
      setError('Jaringan bermasalah, coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="hud-panel p-[18px]">
      {/* Jam operasional */}
      <h3 className="hud-label mb-3 text-[11px]" style={{ color: '#c3ccd6' }}>Jam Operasional</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="hud-label mb-1.5 block text-[10px]" style={{ color: '#8a97a3' }}>Jam Buka</label>
          <input
            type="time"
            step={3600}
            value={jam2(jamBuka)}
            onChange={(e) => setJamBuka(parseJam(e.target.value))}
            className={inputCls}
            style={{ colorScheme: 'dark' }}
          />
        </div>
        <div>
          <label className="hud-label mb-1.5 block text-[10px]" style={{ color: '#8a97a3' }}>Jam Tutup</label>
          <input
            type="time"
            step={3600}
            value={jam2(jamTutup)}
            onChange={(e) => setJamTutup(parseJam(e.target.value))}
            className={inputCls}
            style={{ colorScheme: 'dark' }}
          />
        </div>
      </div>
      <p className="mt-1.5 text-[11px]" style={{ color: '#6b7785' }}>
        Peminjaman via pilih daftar hanya dalam {jam2(jamBuka)}–{jam2(jamTutup)} WIB.
      </p>

      {/* Aturan peminjaman */}
      <h3 className="hud-label mb-3 mt-5 text-[11px]" style={{ color: '#c3ccd6' }}>Aturan Peminjaman</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="hud-label mb-1.5 block text-[10px]" style={{ color: '#8a97a3' }}>Maks Unit / Siswa</label>
          <Stepper value={maxUnit} setValue={setMaxUnit} min={1} max={50} />
        </div>
        <div>
          <label className="hud-label mb-1.5 block text-[10px]" style={{ color: '#8a97a3' }}>Maks Hari Pinjam</label>
          <Stepper value={maxHari} setValue={setMaxHari} min={1} max={30} />
        </div>
      </div>
      <p className="mt-1.5 text-[11px]" style={{ color: '#6b7785' }}>
        {maxHari <= 1 ? 'Wajib kembali di hari yang sama.' : `Batas kembali ${maxHari} hari sejak pinjam.`}
      </p>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13.5px] font-semibold" style={{ color: '#f0f4f8' }}>Boleh pilih beberapa unit / alat</p>
          <p className="text-[11.5px]" style={{ color: '#8a97a3' }}>
            Siswa dapat meminjam lebih dari 1 unit dari jenis alat yang sama.
          </p>
        </div>
        <Toggle on={multiUnit} onToggle={() => setMultiUnit((v) => !v)} warna="#a855f7" />
      </div>

      {/* Toggle */}
      <h3 className="hud-label mb-3 mt-5 text-[11px]" style={{ color: '#c3ccd6' }}>Otomatisasi</h3>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13.5px] font-semibold" style={{ color: '#f0f4f8' }}>Verifikasi otomatis</p>
            <p className="text-[11.5px]" style={{ color: '#8a97a3' }}>Pengajuan baru langsung disetujui (dipinjam) tanpa perlu approve.</p>
          </div>
          <Toggle on={autoVerif} onToggle={() => setAutoVerif((v) => !v)} warna="#5c84ff" />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13.5px] font-semibold" style={{ color: '#f0f4f8' }}>Peringatan keterlambatan</p>
            <p className="text-[11.5px]" style={{ color: '#8a97a3' }}>Tandai peminjaman yang lewat batas kembali di laporan.</p>
          </div>
          <Toggle on={peringatan} onToggle={() => setPeringatan((v) => !v)} warna="#eab308" />
        </div>
      </div>

      {error && (
        <p className="mt-3 px-3 py-2 text-[12.5px] hud-clip-sm" style={{ color: '#fca5a5', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>{error}</p>
      )}
      {saved && (
        <p className="mt-3 px-3 py-2 text-[12.5px] hud-clip-sm" style={{ color: '#4ade80', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)' }}>Pengaturan tersimpan.</p>
      )}

      <button
        type="button"
        onClick={simpan}
        disabled={saving}
        className="hud-btn-primary mt-4 w-full py-3 text-[12px] disabled:opacity-50"
      >
        {saving ? 'MENYIMPAN…' : 'SIMPAN PENGATURAN'}
      </button>
    </div>
  )
}
