import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface GlassCardProps {
  children: ReactNode
  className?: string
}

export function GlassCard({ children, className }: GlassCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-neutral-800 bg-white/[0.03] backdrop-blur-sm',
        className
      )}
    >
      {children}
    </div>
  )
}
