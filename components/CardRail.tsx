import { type ReactNode } from 'react'

/**
 * Responsive shelf: a horizontal scroll-snap rail on mobile that becomes the
 * section's existing CSS grid at sm:+ (desktop unchanged). Pure CSS — no JS, no
 * scroll listeners, reduced-motion safe by construction.
 *
 * Mobile: a full-bleed snap rail. Each card is `w-[78%]` so the next one peeks
 * (~22%), which is the "this is swipeable" affordance — the App Store / Netflix
 * shelf model. A static edge-fade mask (the `.card-rail` rule in globals.css,
 * scoped <640px) dissolves cards into the bleed gutter.
 *
 * sm+: `sm:flex-none` cancels the rail and `gridClassName` (whose grid utilities
 * are all sm:-prefixed) takes over, so the element is byte-for-byte the grid the
 * section used before. This is the load-bearing detail: callers must pass the
 * desktop grid classes with the mobile tier stripped, e.g.
 *   `sm:grid sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4`
 */
export function CardRail({
  items,
  gridClassName,
  ariaLabel,
}: {
  /** One node per card. Mobile wraps each as a snap item; sm:+ they flow into the grid. */
  items: Array<{ key: string; node: ReactNode }>
  /** The section's desktop grid classes, with every grid utility sm:-prefixed. */
  gridClassName: string
  ariaLabel?: string
}) {
  return (
    <ul
      aria-label={ariaLabel}
      className={`card-rail no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 py-1 sm:mx-0 sm:flex-none sm:snap-none sm:overflow-visible sm:scroll-px-0 sm:px-0 sm:py-0 ${gridClassName}`}
    >
      {items.map(({ key, node }) => (
        <li key={key} className="h-full w-[78%] shrink-0 snap-start sm:w-auto">
          {node}
        </li>
      ))}
    </ul>
  )
}
