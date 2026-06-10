import { GlassCard } from '@/components/shared/GlassCard'

// Skeleton global untuk semua halaman di dalam (protected).
// Next.js menampilkan ini otomatis selama Server Component memuat data,
// sehingga navigasi antar menu langsung memberi respons visual (tidak "freeze").
// Bentuknya sengaja generik (judul + baris kartu + grid) agar pas untuk
// dashboard, alat, peminjaman, users, laporan, maupun halaman detail.

function Bar({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-neutral-800 ${className}`} />
}

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Judul halaman */}
      <div className="space-y-2">
        <Bar className="h-6 w-48" />
        <Bar className="h-4 w-32" />
      </div>

      {/* Baris kartu statistik / filter */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <GlassCard key={i} className="p-4">
            <Bar className="mb-3 h-7 w-12" />
            <Bar className="h-3 w-20" />
          </GlassCard>
        ))}
      </div>

      {/* Grid konten utama */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <GlassCard key={i} className="p-4">
            <div className="mb-3 flex items-start justify-between">
              <Bar className="h-9 w-9 rounded-lg" />
              <Bar className="h-5 w-12 rounded-full" />
            </div>
            <Bar className="mb-2 h-4 w-4/5" />
            <Bar className="h-3 w-1/2" />
          </GlassCard>
        ))}
      </div>
    </div>
  )
}
