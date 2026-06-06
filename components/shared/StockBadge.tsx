import { cn, stockColor, stockLabel } from '@/lib/utils'

interface StockBadgeProps {
  stok: number
  stokTersedia?: number
  className?: string
}

export function StockBadge({ stok, stokTersedia, className }: StockBadgeProps) {
  const display = stokTersedia !== undefined ? stokTersedia : stok
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        stockColor(display),
        className
      )}
    >
      {display} — {stockLabel(display)}
    </span>
  )
}
