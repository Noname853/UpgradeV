'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { GlassCard } from '@/components/shared/GlassCard'
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
    <GlassCard className="p-5">
      <h2 className="mb-3 text-sm font-semibold text-neutral-300">Aksi</h2>
      {error && (
        <p className="mb-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {error}
        </p>
      )}
      <div className="space-y-2">
        {canVerify && (
          <button
            onClick={() => doAction('verify')}
            disabled={loading === 'verify'}
            className="flex w-full items-center gap-2 rounded-lg bg-green-500/10 px-3 py-2.5 text-sm text-green-400 transition hover:bg-green-500/20 disabled:opacity-60"
          >
            <CheckCircle className="h-4 w-4" />
            {loading === 'verify' ? 'Memproses...' : 'Verifikasi & Setujui'}
          </button>
        )}
        {canReturn && (
          <button
            onClick={() => doAction('return')}
            disabled={loading === 'return'}
            className="flex w-full items-center gap-2 rounded-lg bg-blue-500/10 px-3 py-2.5 text-sm text-blue-400 transition hover:bg-blue-500/20 disabled:opacity-60"
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
            className="flex w-full items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2.5 text-sm text-red-400 transition hover:bg-red-500/20 disabled:opacity-60"
          >
            <XCircle className="h-4 w-4" />
            {loading === 'cancel' ? 'Membatalkan...' : 'Batalkan Peminjaman'}
          </button>
        )}
      </div>
    </GlassCard>
  )
}
