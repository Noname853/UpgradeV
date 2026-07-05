'use client'

import { Printer } from 'lucide-react'

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="hud-btn-primary inline-flex items-center gap-2 px-4 py-2.5 text-[11.5px]"
    >
      <Printer className="h-4 w-4" />
      CETAK (CTRL+P)
    </button>
  )
}
