'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { CheckCircle, RotateCcw, XCircle } from 'lucide-react'

interface Props {
  id: number
  status: string
  isAdmin: boolean
  isOwner: boolean
}

export function PeminjamanActions({ id, status, isAdmin, isOwner }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function doAction(action: string, body: Record<string, unknown> = {}) {
    setLoading(action)
    setError('')
    const res = await fetch(`/api/peminjaman/${id}/${action}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error ?? 'Terjadi kesalahan')
    }
    setLoading(null)
  }

  const canVerify = isAdmin && status === 'menunggu_verifikasi'
  const canReturn = isAdmin && status === 'dipinjam'
  const canCancel = (isAdmin || isOwner) && ['menunggu_verifikasi', 'dipinjam'].includes(status)

  if (!canVerify && !canReturn && !canCancel) return null

  return (
    <div className="hud-panel p-5">
      <h2 className="hud-label mb-3.5 text-[11px]" style={{ color: '#c3ccd6' }}>Aksi</h2>
      {error && (
        <p
          className="mb-3 px-3 py-2 text-xs hud-clip-sm"
          style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}
        >
          {error}
        </p>
      )}
      <div className="flex flex-col gap-2.5">
        {canVerify && (
          <button
            onClick={() => doAction('verify')}
            disabled={loading === 'verify'}
            className="flex w-full items-center gap-2.5 px-3.5 py-3 text-[13.5px] font-semibold transition hud-clip-sm disabled:opacity-60"
            style={{ color: '#22c55e', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}
          >
            <CheckCircle className="h-4 w-4" />
            {loading === 'verify' ? 'Memproses...' : 'Verifikasi & Setujui'}
          </button>
        )}
        {canReturn && (
          <button
            onClick={() => doAction('return')}
            disabled={loading === 'return'}
            className="flex w-full items-center gap-2.5 px-3.5 py-3 text-[13.5px] font-semibold transition hud-clip-sm disabled:opacity-60"
            style={{ color: '#5c84ff', background: 'rgba(92,132,255,0.1)', border: '1px solid rgba(92,132,255,0.25)' }}
          >
            <RotateCcw className="h-4 w-4" />
            {loading === 'return' ? 'Memproses...' : 'Tandai Dikembalikan'}
          </button>
        )}
        {canCancel && (
          <button
            onClick={() => {
              const alasan = prompt('Alasan pembatalan (opsional):') ?? ''
              doAction('cancel', { alasan })
            }}
            disabled={loading === 'cancel'}
            className="flex w-full items-center gap-2.5 px-3.5 py-3 text-[13.5px] font-semibold transition hud-clip-sm disabled:opacity-60"
            style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}
          >
            <XCircle className="h-4 w-4" />
            {loading === 'cancel' ? 'Membatalkan...' : 'Batalkan Peminjaman'}
          </button>
        )}
      </div>
    </div>
  )
}
