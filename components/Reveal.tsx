'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Scroll-reveal wrapper. Motivated motion: content enters as it scrolls into
 * view (storytelling/hierarchy), once. Uses IntersectionObserver — never a
 * scroll listener. Default-visible if IO is unavailable or motion is reduced,
 * so content is never trapped hidden (the .reveal class also collapses to
 * visible under prefers-reduced-motion).
 */
// Stagger delay is capped so a large grid never accrues a sluggish cumulative
// wait — items past the cap all arrive together on the final step.
const STAGGER_STEP_MS = 32
const STAGGER_CAP = 8

export function Reveal({
  children,
  delay = 0,
  index,
  as: Tag = 'div',
  className = '',
}: {
  children: ReactNode
  delay?: number
  /** Position in a list/grid — cascades this item in on a capped per-index
   *  delay (delay + index*step). Omit for a standalone reveal. */
  index?: number
  as?: 'div' | 'section' | 'li' | 'header'
  className?: string
}) {
  const ref = useRef<HTMLElement | null>(null)
  const [shown, setShown] = useState(false)
  const totalDelay =
    delay + (index != null ? Math.min(index, STAGGER_CAP) * STAGGER_STEP_MS : 0)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setShown(true)
      return
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setShown(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true)
            io.disconnect()
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const Component = Tag as 'div'
  return (
    <Component
      ref={ref as React.Ref<HTMLDivElement>}
      className={`reveal ${className}`}
      data-shown={shown}
      style={totalDelay ? { transitionDelay: `${totalDelay}ms` } : undefined}
    >
      {children}
    </Component>
  )
}
