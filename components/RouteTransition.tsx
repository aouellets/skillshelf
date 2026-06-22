'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

/**
 * App-like route transition. Re-keys its child on each pathname change so the
 * `.route-transition` keyframe (a fast rise + fade, --ease-entrance) replays on
 * navigation. Transform/opacity only — no layout shift, GPU-friendly. Under
 * prefers-reduced-motion the global net in globals.css collapses it to an
 * instant cut, so content is never withheld or janky.
 */
export function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  return (
    <div key={pathname} className="route-transition">
      {children}
    </div>
  )
}
