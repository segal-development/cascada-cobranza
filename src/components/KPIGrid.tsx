import type { ReactNode } from 'react'

interface KPIGridProps {
  cols?: 3 | 4
  children: ReactNode
}

export function KPIGrid({ cols = 3, children }: KPIGridProps) {
  return (
    <div
      className={`grid gap-4 mt-5 ${
        cols === 4 ? 'grid-cols-4' : 'grid-cols-3'
      }`}
    >
      {children}
    </div>
  )
}
