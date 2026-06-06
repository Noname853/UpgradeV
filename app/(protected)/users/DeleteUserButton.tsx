'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface Props {
  id: number
  isActive: boolean
}

export function DeleteUserButton({ id, isActive }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleToggle() {
    const konfirmasi = isActive
      ? 'Nonaktifkan user ini? Mereka tidak akan bisa login.'
      : 'Aktifkan kembali user ini?'
    if (!confirm(konfirmasi)) return

    setLoading(true)
    const res = await fetch(`/api/users/${id}`, { method: 'PATCH' })
    if (res.ok) {
      router.refresh()
    } else {
      try {
        const data = await res.json()
        alert(data.error ?? 'Gagal mengubah status user')
      } catch {
        alert('Gagal mengubah status user')
      }
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Hapus permanen user ini? Semua data riwayat akan ikut terhapus.')) return

    setLoading(true)
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
    if (res.ok) {
      router.refresh()
    } else {
      try {
        const data = await res.json()
        alert(data.error ?? 'Gagal menghapus user')
      } catch {
        alert('Gagal menghapus user')
      }
      setLoading(false)
    }
  }

  if (loading) return <span className="text-xs text-neutral-600">...</span>

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleToggle}
        className={`text-xs ${isActive ? 'text-yellow-500 hover:text-yellow-400' : 'text-green-500 hover:text-green-400'}`}
      >
        {isActive ? 'Nonaktifkan' : 'Aktifkan'}
      </button>
      {!isActive && (
        <button onClick={handleDelete} className="text-xs text-red-500 hover:text-red-400">
          Hapus
        </button>
      )}
    </div>
  )
}
