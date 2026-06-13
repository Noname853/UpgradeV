'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { GlassCard } from '@/components/shared/GlassCard'

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

  const inputClass =
    'w-full rounded-lg border border-neutral-700 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder-neutral-600 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30'

  return (
    <GlassCard className="max-w-2xl p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm text-neutral-300">Kode Alat *</label>
            <input name="kode" required defaultValue={initial?.kode as string} placeholder="JRN001" className={inputClass} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-neutral-300">Kategori *</label>
            <input name="kategori" required defaultValue={initial?.kategori as string} placeholder="Jaringan" className={inputClass} />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-neutral-300">Nama Alat *</label>
          <input name="nama" required defaultValue={initial?.nama as string} placeholder="Switch TP-Link 24 Port" className={inputClass} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm text-neutral-300">Stok</label>
            <input name="stok" type="number" min="0" defaultValue={initial?.stok as number ?? 0} className={inputClass} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-neutral-300">Lokasi</label>
            <input name="lokasi" defaultValue={initial?.lokasi as string} placeholder="Lab Jaringan" className={inputClass} />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-neutral-300">Deskripsi</label>
          <textarea name="deskripsi" rows={3} defaultValue={initial?.deskripsi as string} placeholder="Keterangan alat..." className={inputClass} />
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-neutral-300">Foto Alat (URL)</label>
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
          <p className="mt-1 text-xs text-neutral-500">
            Tempel link gambar (jpg/png). Gambar akan tampil di halaman detail alat.
          </p>
          {foto.trim() && (
            <div className="mt-3">
              {fotoError ? (
                <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
                  Gambar gagal dimuat. Periksa kembali URL-nya.
                </p>
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={foto.trim()}
                  alt="Pratinjau foto alat"
                  onError={() => setFotoError(true)}
                  className="h-40 w-full rounded-lg border border-neutral-800 object-cover"
                />
              )}
            </div>
          )}
        </div>

        <div className="border-t border-neutral-800 pt-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">EOS / EOL (Opsional)</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm text-neutral-300">Tanggal EOS</label>
              <input name="tanggalEos" type="date" defaultValue={initial?.tanggalEos as string} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-neutral-300">Tanggal EOL</label>
              <input name="tanggalEol" type="date" defaultValue={initial?.tanggalEol as string} className={inputClass} />
            </div>
          </div>
        </div>

        {error && (
          <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:from-blue-500 hover:to-purple-500 disabled:opacity-60"
          >
            {loading ? 'Menyimpan...' : initial ? 'Simpan Perubahan' : 'Tambah Alat'}
          </button>
        </div>
      </form>
    </GlassCard>
  )
}
