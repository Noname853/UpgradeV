'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Trash2 } from 'lucide-react'

export function DeleteAlatButton({ id }: { id: number }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm('Yakin hapus alat ini?')) return
    setLoading(true)
    const res = await fetch(`/api/alat/${id}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/alat')
    } else {
      const data = await res.json()
      alert(data.error ?? 'Gagal menghapus')
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="flex items-center gap-2 rounded-lg border border-red-500/30 px-3 py-2 text-sm text-red-400 transition hover:bg-red-500/10 disabled:opacity-60"
    >
      <Trash2 className="h-4 w-4" />
      {loading ? '...' : 'Hapus'}
    </button>
  )
}
