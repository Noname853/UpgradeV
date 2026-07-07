'use client'

import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import {
  Boxes,
  Download,
  Upload,
  Plus,
  SquarePen,
  Trash2,
  Check,
  X,
  ImagePlus,
  AlertTriangle,
} from 'lucide-react'

export interface LabItemView {
  id: number
  nama: string
  jumlah: string
  baik: number | null
  rusak: number | null
  deskripsi: string | null
  link: string | null
  foto: string | null
}

export interface LabSheetView {
  id: number
  nama: string
  jenis: 'lab' | 'need'
  items: LabItemView[]
}

interface Props {
  sheets: LabSheetView[]
}

type Toast = { kind: 'ok' | 'err'; text: string }

export function InventarisLabClient({ sheets }: Props) {
  const router = useRouter()
  const [activeId, setActiveId] = useState<number | null>(sheets[0]?.id ?? null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importBusy, setImportBusy] = useState(false)
  const [lightbox, setLightbox] = useState<{ nama: string; foto: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Draft edit inline (satu baris sekaligus)
  const [draft, setDraft] = useState({ nama: '', jumlah: '', baik: '', rusak: '', deskripsi: '', link: '' })

  const active = sheets.find((s) => s.id === activeId) ?? sheets[0] ?? null
  // Endpoint download API (bukan halaman) — variabel agar tidak salah dikira
  // navigasi antar-halaman oleh linter next.
  const exportUrl = '/api/lab-inventaris/export'

  function notify(kind: Toast['kind'], text: string) {
    setToast({ kind, text })
  }

  async function api(method: string, url: string, body?: unknown): Promise<boolean> {
    setBusy(true)
    try {
      const res = await fetch(url, {
        method,
        headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        notify('err', data.error ?? 'Terjadi kesalahan')
        return false
      }
      router.refresh()
      return true
    } catch {
      notify('err', 'Jaringan bermasalah, coba lagi.')
      return false
    } finally {
      setBusy(false)
    }
  }

  function mulaiEdit(it: LabItemView) {
    setEditingId(it.id)
    setDraft({
      nama: it.nama,
      jumlah: it.jumlah,
      baik: it.baik === null ? '' : String(it.baik),
      rusak: it.rusak === null ? '' : String(it.rusak),
      deskripsi: it.deskripsi ?? '',
      link: it.link ?? '',
    })
  }

  async function simpanEdit(it: LabItemView, jenis: 'lab' | 'need') {
    const body: Record<string, unknown> = {
      nama: draft.nama.trim(),
      jumlah: draft.jumlah.trim(),
    }
    if (jenis === 'lab') {
      body.baik = draft.baik.trim() === '' ? null : Number(draft.baik)
      body.rusak = draft.rusak.trim() === '' ? null : Number(draft.rusak)
      body.deskripsi = draft.deskripsi.trim()
    } else {
      body.link = draft.link.trim()
    }
    if (await api('PATCH', `/api/lab-inventaris/${it.id}`, body)) {
      setEditingId(null)
      notify('ok', `"${body.nama}" tersimpan.`)
    }
  }

  async function ubahFoto(it: LabItemView) {
    const url = prompt('URL foto (harus https://…, kosongkan untuk menghapus):', it.foto ?? 'https://')
    if (url === null) return
    const bersih = url.trim()
    if (bersih && bersih !== 'https://' && !/^https:\/\/.+/i.test(bersih)) {
      notify('err', 'URL foto harus diawali https:// — sama seperti aturan foto Alat.')
      return
    }
    const foto = bersih === '' || bersih === 'https://' ? '' : bersih
    if (await api('PATCH', `/api/lab-inventaris/${it.id}`, { foto })) {
      notify('ok', foto ? `Foto terpasang untuk "${it.nama}".` : `Foto "${it.nama}" dihapus.`)
    }
  }

  async function hapus(it: LabItemView) {
    if (!confirm(`Hapus "${it.nama}" dari ${active?.nama}?`)) return
    if (await api('DELETE', `/api/lab-inventaris/${it.id}`)) {
      setEditingId(null)
      notify('ok', `"${it.nama}" dihapus.`)
    }
  }

  async function tambah() {
    if (!active) return
    if (
      await api('POST', '/api/lab-inventaris', {
        sheetId: active.id,
        nama: 'Barang baru',
        jumlah: '1',
      })
    ) {
      notify('ok', 'Barang baru ditambahkan — klik ✎ untuk mengisi datanya.')
    }
  }

  async function doImport(file: File) {
    setImportBusy(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/lab-inventaris/import', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        notify('err', data.error ?? 'Import gagal')
        return
      }
      setImportOpen(false)
      notify('ok', `Data diganti dari file baru: ${data.sheets} sheet, ${data.items} barang.`)
      router.refresh()
    } catch {
      notify('err', 'Jaringan bermasalah, coba lagi.')
    } finally {
      setImportBusy(false)
    }
  }

  const statAktif = (() => {
    if (!active) return null
    if (active.jenis === 'need') {
      return [{ label: 'Barang Diminta', value: active.items.length, color: '#5c84ff' }]
    }
    let unit = 0
    let rusak = 0
    let foto = 0
    for (const it of active.items) {
      const n = Number(it.jumlah)
      if (Number.isFinite(n)) unit += n
      rusak += it.rusak ?? 0
      if (it.foto) foto++
    }
    return [
      { label: 'Jenis Barang', value: active.items.length, color: '#5c84ff' },
      { label: 'Total Unit', value: unit, color: '#e8edf2' },
      { label: 'Rusak', value: rusak, color: rusak > 0 ? '#ef4444' : '#22c55e' },
      { label: 'Punya Foto', value: foto, color: '#a855f7' },
    ]
  })()

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3 hud-rise">
        <div className="min-w-0 flex-1">
          <h1 className="hud-title" style={{ fontSize: 26 }}>Inventaris Lab</h1>
          <p className="mt-1.5 text-[14px]" style={{ color: '#8a97a3' }}>
            Sensus kondisi &amp; stok per lab — data dari file Excel yang diimpor
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <a href={exportUrl} className="hud-btn-ghost flex items-center gap-2 px-4 py-2.5 text-[12px]">
            <Download className="h-4 w-4" />
            Export Excel
          </a>
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="hud-btn-primary flex items-center gap-2 px-[18px] py-2.5 text-[12px]"
          >
            <Upload className="h-4 w-4" />
            IMPORT / GANTI EXCEL
          </button>
        </div>
      </div>

      {sheets.length === 0 ? (
        <div className="hud-panel p-10 text-center">
          <Boxes className="mx-auto mb-3 h-10 w-10" style={{ color: '#5d717d' }} />
          <p className="text-[15px] font-semibold" style={{ color: '#e8edf2' }}>Belum ada data inventaris lab</p>
          <p className="mx-auto mt-1.5 max-w-md text-[13px]" style={{ color: '#8a97a3' }}>
            Upload file Excel (format seperti RData_Base_Lab_K.xlsx: sheet per lab dengan kolom Nama
            Alat/Jumlah/Baik/Rusak) lewat tombol Import di atas.
          </p>
        </div>
      ) : (
        <>
          {/* tab per sheet */}
          <div className="mb-4 flex flex-wrap gap-2">
            {sheets.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => { setActiveId(s.id); setEditingId(null) }}
                className="hud-clip-sm px-3 py-1.5 text-[12px] font-semibold"
                style={
                  s.id === active?.id
                    ? { color: '#fff', border: '1px solid rgba(92,132,255,0.6)', background: 'rgba(92,132,255,0.15)' }
                    : { color: '#8a97a3', border: '1px solid rgba(99,102,241,0.2)' }
                }
              >
                {s.nama} <span style={{ color: s.id === active?.id ? '#b9c9ff' : '#5d717d' }}>{s.items.length}</span>
              </button>
            ))}
          </div>

          {/* statistik sheet aktif */}
          {statAktif && (
            <div className="mb-4 grid gap-[13px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
              {statAktif.map((st) => (
                <div
                  key={st.label}
                  className="hud-panel p-4 text-center"
                  style={{ border: `1px solid ${st.color}30` }}
                >
                  <p className="hud-title text-[24px]" style={{ color: st.color }}>{st.value}</p>
                  <p className="mt-0.5 text-[11px]" style={{ color: '#6b7785' }}>{st.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* tabel */}
          {active && (
            <div className="hud-panel overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-max text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(99,102,241,0.16)' }} className="text-left">
                      <th className="hud-label px-3 py-3 text-[10px]" style={{ color: '#6b7785', width: 40 }}>No</th>
                      <th className="hud-label px-3 py-3 text-[10px]" style={{ color: '#6b7785', width: 60 }}>Foto</th>
                      <th className="hud-label px-3 py-3 text-[10px]" style={{ color: '#6b7785' }}>
                        {active.jenis === 'need' ? 'Barang' : 'Nama Alat'}
                      </th>
                      <th className="hud-label px-3 py-3 text-[10px]" style={{ color: '#6b7785' }}>Jumlah</th>
                      {active.jenis === 'lab' ? (
                        <>
                          <th className="hud-label px-3 py-3 text-[10px]" style={{ color: '#6b7785' }}>Baik</th>
                          <th className="hud-label px-3 py-3 text-[10px]" style={{ color: '#6b7785' }}>Rusak</th>
                          <th className="hud-label px-3 py-3 text-[10px]" style={{ color: '#6b7785' }}>Deskripsi</th>
                        </>
                      ) : (
                        <th className="hud-label px-3 py-3 text-[10px]" style={{ color: '#6b7785' }}>Link</th>
                      )}
                      <th className="hud-label px-3 py-3 text-right text-[10px]" style={{ color: '#6b7785', width: 130 }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {active.items.map((it, i) => {
                      const isEdit = editingId === it.id
                      const inputStyle = {
                        color: '#e8edf2',
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(92,132,255,0.45)',
                      }
                      return (
                        <tr key={it.id} style={{ borderBottom: '1px solid rgba(99,102,241,0.08)' }} className="transition hover:bg-white/[0.02]">
                          <td className="px-3 py-2.5" style={{ color: '#6b7785' }}>{i + 1}</td>
                          <td className="px-3 py-2.5">
                            {it.foto ? (
                              <button
                                type="button"
                                onClick={() => setLightbox({ nama: it.nama, foto: it.foto! })}
                                className="block h-11 w-11 overflow-hidden hud-clip-sm"
                                style={{ border: '1px solid rgba(99,102,241,0.3)' }}
                                title="Lihat foto"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element -- URL foto eksternal (https), next/image butuh konfigurasi domain per host */}
                                <img src={it.foto} alt={it.nama} className="h-full w-full object-cover" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => ubahFoto(it)}
                                className="flex h-11 w-11 items-center justify-center hud-clip-sm"
                                style={{ border: '1px dashed rgba(99,102,241,0.35)', color: '#5d717d' }}
                                title="Pasang foto (URL https)"
                              >
                                <ImagePlus className="h-4 w-4" />
                              </button>
                            )}
                          </td>
                          <td className="px-3 py-2.5" style={{ minWidth: 180 }}>
                            {isEdit ? (
                              <input value={draft.nama} onChange={(e) => setDraft({ ...draft, nama: e.target.value })} maxLength={200} className="w-full px-2 py-1.5 text-[13px] hud-clip-sm" style={inputStyle} />
                            ) : (
                              <span className="text-[13.5px] font-semibold" style={{ color: '#e8edf2' }}>{it.nama}</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5" style={{ color: '#c3ccd6' }}>
                            {isEdit ? (
                              <input value={draft.jumlah} onChange={(e) => setDraft({ ...draft, jumlah: e.target.value })} maxLength={50} className="w-24 px-2 py-1.5 text-[13px] hud-clip-sm" style={inputStyle} />
                            ) : (
                              it.jumlah || '—'
                            )}
                          </td>
                          {active.jenis === 'lab' ? (
                            <>
                              <td className="px-3 py-2.5" style={{ color: '#4ade80' }}>
                                {isEdit ? (
                                  <input type="number" min={0} value={draft.baik} onChange={(e) => setDraft({ ...draft, baik: e.target.value })} className="w-16 px-2 py-1.5 text-[13px] hud-clip-sm" style={inputStyle} />
                                ) : (
                                  it.baik ?? '—'
                                )}
                              </td>
                              <td className="px-3 py-2.5">
                                {isEdit ? (
                                  <input type="number" min={0} value={draft.rusak} onChange={(e) => setDraft({ ...draft, rusak: e.target.value })} className="w-16 px-2 py-1.5 text-[13px] hud-clip-sm" style={inputStyle} />
                                ) : it.rusak && it.rusak > 0 ? (
                                  <span
                                    className="rounded-full px-2.5 py-0.5 text-[11.5px] font-bold"
                                    style={{ color: '#fca5a5', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}
                                  >
                                    {it.rusak}
                                  </span>
                                ) : (
                                  <span style={{ color: '#6b7785' }}>—</span>
                                )}
                              </td>
                              <td className="max-w-[280px] truncate px-3 py-2.5 text-[12px]" style={{ color: '#8a97a3' }} title={it.deskripsi ?? ''}>
                                {isEdit ? (
                                  <input value={draft.deskripsi} onChange={(e) => setDraft({ ...draft, deskripsi: e.target.value })} maxLength={1000} className="w-full px-2 py-1.5 text-[12.5px] hud-clip-sm" style={inputStyle} />
                                ) : (
                                  it.deskripsi || '—'
                                )}
                              </td>
                            </>
                          ) : (
                            <td className="max-w-[280px] truncate px-3 py-2.5 text-[12.5px]">
                              {isEdit ? (
                                <input value={draft.link} onChange={(e) => setDraft({ ...draft, link: e.target.value })} maxLength={2000} placeholder="https://…" className="w-full px-2 py-1.5 text-[12.5px] hud-clip-sm" style={inputStyle} />
                              ) : it.link ? (
                                <a href={it.link} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: '#5c84ff' }}>
                                  {it.link}
                                </a>
                              ) : (
                                <span style={{ color: '#6b7785' }}>—</span>
                              )}
                            </td>
                          )}
                          <td className="px-3 py-2.5">
                            <div className="flex items-center justify-end gap-1.5">
                              {isEdit ? (
                                <>
                                  <button type="button" disabled={busy} onClick={() => simpanEdit(it, active.jenis)} className="flex h-7 w-7 items-center justify-center hud-clip-sm" style={{ color: '#4ade80', border: '1px solid rgba(34,197,94,0.35)' }} title="Simpan">
                                    <Check className="h-3.5 w-3.5" />
                                  </button>
                                  <button type="button" onClick={() => setEditingId(null)} className="flex h-7 w-7 items-center justify-center hud-clip-sm" style={{ color: '#8a97a3', border: '1px solid rgba(99,102,241,0.3)' }} title="Batal">
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button type="button" disabled={busy} onClick={() => ubahFoto(it)} className="flex h-7 w-7 items-center justify-center hud-clip-sm" style={{ color: '#a855f7', border: '1px solid rgba(168,85,247,0.3)' }} title="Ubah Foto">
                                    <ImagePlus className="h-3.5 w-3.5" />
                                  </button>
                                  <button type="button" disabled={busy} onClick={() => mulaiEdit(it)} className="flex h-7 w-7 items-center justify-center hud-clip-sm" style={{ color: '#5c84ff', border: '1px solid rgba(92,132,255,0.3)' }} title="Edit">
                                    <SquarePen className="h-3.5 w-3.5" />
                                  </button>
                                  <button type="button" disabled={busy} onClick={() => hapus(it)} className="flex h-7 w-7 items-center justify-center hud-clip-sm" style={{ color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }} title="Hapus">
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
              {active.items.length === 0 && (
                <p className="px-4 py-8 text-center text-[13px]" style={{ color: '#6b7785' }}>
                  Sheet ini kosong — tambah barang atau import ulang.
                </p>
              )}
            </div>
          )}

          <button
            type="button"
            disabled={busy || !active}
            onClick={tambah}
            className="mt-3 inline-flex items-center gap-2 text-[13px] font-semibold disabled:opacity-50"
            style={{ color: '#5c84ff' }}
          >
            <Plus className="h-4 w-4" />
            Tambah Barang
          </button>
        </>
      )}

      {toast && (
        <p
          className="mt-4 px-3.5 py-2.5 text-[13px] leading-relaxed hud-clip-sm"
          role="status"
          aria-live="polite"
          style={
            toast.kind === 'ok'
              ? { color: '#6ee7b7', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.35)' }
              : { color: '#fca5a5', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.35)' }
          }
        >
          {toast.text}
        </p>
      )}

      {/* dialog import */}
      {importOpen &&
        typeof window !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ background: 'rgba(3,7,14,0.75)' }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !importBusy) setImportOpen(false)
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Import Excel inventaris lab"
          >
            <div className="hud-clip-md w-full max-w-md p-5" style={{ background: '#0d1520', border: '1px solid rgba(92,132,255,0.3)' }}>
              <h3 className="text-[15px] font-bold" style={{ color: '#e8edf2' }}>Import / Ganti Excel</h3>
              <p className="mt-1 text-[12.5px] leading-relaxed" style={{ color: '#8a97a3' }}>
                Upload .xlsx dengan format sheet yang sama (kolom Nama Alat/Barang, Jumlah, Baik, Rusak…).
                File hanya dicerna lalu dibuang — tidak disimpan di server.
              </p>

              <button
                type="button"
                disabled={importBusy}
                onClick={() => fileRef.current?.click()}
                className="mt-3.5 w-full px-4 py-6 text-center text-[13px] hud-clip-sm"
                style={{ color: '#8a97a3', borderStyle: 'dashed', borderWidth: 1.5, borderColor: 'rgba(92,132,255,0.45)' }}
              >
                {importBusy ? 'Memproses…' : <>Klik untuk <b style={{ color: '#5c84ff' }}>pilih file .xlsx</b> (maks 5 MB)</>}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  e.target.value = ''
                  if (f) doImport(f)
                }}
              />

              <p
                className="mt-3.5 flex items-start gap-2 px-3 py-2.5 text-[12px] leading-relaxed hud-clip-sm"
                style={{ color: '#fbbf24', background: 'rgba(234,179,8,0.07)', border: '1px solid rgba(234,179,8,0.35)' }}
              >
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Seluruh data lama (termasuk foto &amp; hasil edit) akan ditimpa permanen. Export dulu bila perlu cadangan.
              </p>

              <button
                type="button"
                disabled={importBusy}
                onClick={() => setImportOpen(false)}
                className="mt-3.5 w-full px-3.5 py-2.5 text-[13px] font-semibold hud-clip-sm disabled:opacity-50"
                style={{ color: '#8a97a3', border: '1px solid rgba(99,102,241,0.25)' }}
              >
                Batal
              </button>
            </div>
          </div>,
          document.body,
        )}

      {/* lightbox foto */}
      {lightbox &&
        typeof window !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ background: 'rgba(3,7,14,0.85)' }}
            onMouseDown={() => setLightbox(null)}
            role="dialog"
            aria-modal="true"
            aria-label={`Foto ${lightbox.nama}`}
          >
            <figure className="max-w-[92vw] text-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- URL foto eksternal (https) */}
              <img
                src={lightbox.foto}
                alt={lightbox.nama}
                className="mx-auto max-h-[78vh] max-w-full rounded-xl object-contain"
                style={{ border: '1px solid rgba(99,102,241,0.3)' }}
              />
              <figcaption className="mt-3 text-[13.5px] font-semibold" style={{ color: '#e8edf2' }}>
                {lightbox.nama}
              </figcaption>
            </figure>
          </div>,
          document.body,
        )}
    </div>
  )
}
