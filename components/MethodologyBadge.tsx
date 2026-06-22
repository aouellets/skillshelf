import { getMethodology } from '@/lib/methodology'

/**
 * Compact "applies the <methodology>" chip for skill/pack cards and detail
 * pages. Descriptive methodology use — NOT an authorship/endorsement claim (see
 * lib/methodology.ts). Renders nothing when the subject has no methodology tag.
 */
export function MethodologyBadge({
  tags,
  className = '',
}: {
  tags?: string[] | null
  className?: string
}) {
  const m = getMethodology(tags)
  if (!m) return null
  return (
    <span
      title={m.title}
      className={`inline-flex items-center gap-1 rounded-xs border border-accent-border bg-accent-dim px-1.5 py-0.5 font-mono text-xs leading-none text-accent ${className}`}
    >
      {m.label}
    </span>
  )
}
