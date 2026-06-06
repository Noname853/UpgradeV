import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '-'
  return new Date(date).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    menunggu_verifikasi: 'Menunggu Verifikasi',
    dipinjam: 'Dipinjam',
    dikembalikan: 'Dikembalikan',
    dibatalkan: 'Dibatalkan',
  }
  return labels[status] ?? status
}

export function statusColor(status: string): string {
  const colors: Record<string, string> = {
    menunggu_verifikasi: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    dipinjam: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    dikembalikan: 'text-green-400 bg-green-400/10 border-green-400/20',
    dibatalkan: 'text-red-400 bg-red-400/10 border-red-400/20',
  }
  return colors[status] ?? 'text-neutral-400 bg-neutral-400/10 border-neutral-400/20'
}

export function stockColor(stok: number): string {
  if (stok === 0) return 'text-red-400 bg-red-400/10 border-red-400/20'
  if (stok <= 5) return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
  return 'text-green-400 bg-green-400/10 border-green-400/20'
}

export function stockLabel(stok: number): string {
  if (stok === 0) return 'Habis'
  if (stok <= 5) return 'Rendah'
  return 'Tersedia'
}
