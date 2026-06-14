'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function AlatForm({ initial }: { initial?: Record<string, unknown> }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [foto, setFoto] = useState((initial?.foto as string) ?? '')
  const [fotoError, setFotoError] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const formData = new FormData(e.currentTarget)

    const body: Record<string, unknown> = {
      kode: formData.get('kode'),
      nama: formData.get('nama'),
      kategori: formData.get('kategori'),
      stok: parseInt(formData.get('stok') as string) || 0,
      lokasi: formData.get('lokasi'),
      deskripsi: formData.get('deskripsi') || null,
      foto: foto.trim() || null,
      tanggalEos: formData.get('tanggalEos') || null,
      tanggalEol: formData.get('tanggalEol') || null,
      keteranganEos: formData.get('keteranganEos') || null,
      keteranganEol: formData.get('keteranganEol') || null,
    }

    const method = initial ? 'PUT' : 'POST'
    const url = initial ? `/api/alat/${initial.id}` : '/api/alat'

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
      router.push(`/alat/${data.id}`)
    }
  }

  const inputClass = 'hud-input w-full px-3.5 py-2.5 text-sm'
  const labelClass = 'mb-2 block text-[13px]'
  const labelStyle = { color: '#b3bdc7' }

  return (
    <div className="hud-panel hud-rise max-w-2xl p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} style={labelStyle}>Kode Alat *</label>
            <input name="kode" required defaultValue={initial?.kode as string} placeholder="JRN001" className={inputClass} />
          </div>
          <div>
            <label className={labelClass} style={labelStyle}>Kategori *</label>
            <input name="kategori" required defaultValue={initial?.kategori as string} placeholder="Jaringan" className={inputClass} />
          </div>
        </div>

        <div>
          <label className={labelClass} style={labelStyle}>Nama Alat *</label>
          <input name="nama" required defaultValue={initial?.nama as string} placeholder="Switch TP-Link 24 Port" className={inputClass} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} style={labelStyle}>Stok</label>
            <input name="stok" type="number" min="0" defaultValue={initial?.stok as number ?? 0} className={inputClass} />
          </div>
          <div>
            <label className={labelClass} style={labelStyle}>Lokasi</label>
            <input name="lokasi" defaultValue={initial?.lokasi as string} placeholder="Lab Jaringan" className={inputClass} />
          </div>
        </div>

        <div>
          <label className={labelClass} style={labelStyle}>Deskripsi</label>
          <textarea name="deskripsi" rows={3} defaultValue={initial?.deskripsi as string} placeholder="Keterangan alat..." className={inputClass} style={{ resize: 'vertical' }} />
        </div>

        <div>
          <label className={labelClass} style={labelStyle}>Foto Alat (URL)</label>
          <input
            name="foto"
            type="url"
            value={foto}
            onChange={(e) => {
              setFoto(e.target.value)
              setFotoError(false)
            }}
            placeholder="https://contoh.com/foto-alat.jpg"
            className={inputClass}
          />
          <p className="mt-2 text-xs" style={{ color: '#6b7785' }}>
            Tempel link gambar (jpg/png). Gambar akan tampil di halaman detail alat.
          </p>
          {foto.trim() && (
            <div className="mt-3">
              {fotoError ? (
                <p
                  className="hud-clip-sm px-3 py-2 text-xs"
                  style={{ color: '#eab308', background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.28)' }}
                >
                  Gambar gagal dimuat. Periksa kembali URL-nya.
                </p>
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={foto.trim()}
                  alt="Pratinjau foto alat"
                  onError={() => setFotoError(true)}
                  className="hud-clip-md max-h-72 w-full object-contain"
                  style={{ border: '1px solid rgba(99,102,241,0.16)', background: 'rgba(255,255,255,0.02)' }}
                />
              )}
            </div>
          )}
        </div>

        <div style={{ borderTop: '1px solid rgba(99,102,241,0.12)', paddingTop: 16 }}>
          <p className="hud-label mb-3 text-[10px]" style={{ color: '#6b7785', letterSpacing: 2 }}>EOS / EOL (Opsional)</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} style={labelStyle}>Tanggal EOS</label>
              <input name="tanggalEos" type="date" defaultValue={initial?.tanggalEos as string} className={inputClass} />
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>Tanggal EOL</label>
              <input name="tanggalEol" type="date" defaultValue={initial?.tanggalEol as string} className={inputClass} />
            </div>
          </div>
        </div>

        {error && (
          <p
            className="hud-clip-sm px-3 py-2 text-sm"
            style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}
          >
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="hud-btn-primary px-7 py-3 text-[12px] disabled:opacity-60"
          >
            {loading ? 'Menyimpan...' : initial ? 'Simpan Perubahan' : 'Tambah Alat'}
          </button>
        </div>
      </form>
    </div>
  )
}
