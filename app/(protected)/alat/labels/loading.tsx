// Skeleton khusus halaman label: meniru toolbar + chip filter + grid stiker,
// supaya klik filter/generate 236 QR tetap terasa responsif (tidak "freeze").

function Bar({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-neutral-800 ${className}`} />
}

export default function Loading() {
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Bar className="h-[38px] w-[38px]" />
        <div className="min-w-0 flex-1 space-y-2">
          <Bar className="h-6 w-52" />
          <Bar className="h-3.5 w-72" />
        </div>
        <Bar className="h-10 w-36" />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Bar key={i} className="h-8 w-28" />
        ))}
      </div>

      <div className="mx-auto max-w-[880px] rounded-md bg-neutral-900 p-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center rounded-lg border border-dashed border-neutral-700 px-2 py-3">
              <Bar className="h-24 w-24" />
              <Bar className="mt-2 h-3.5 w-16" />
              <Bar className="mt-1.5 h-2.5 w-24" />
            </div>
          ))}
        </div>
      </div>

      <p className="mt-4 animate-pulse text-center text-[12px] text-neutral-500">
        Menyiapkan label QR…
      </p>
    </div>
  )
}
