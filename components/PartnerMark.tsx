import type { ResolvedPartner } from '@/lib/partners'
import { MULTICOLOR_MARKS } from '@/lib/partner-logos'

/**
 * A partner's brand mark rendered in full brand color (not grayscale). Shared by
 * the marquee, the trust strip, and the inline PartnerLogo so colorization is
 * consistent. Genuinely multi-color brands (Google, Microsoft) render their real
 * stacked color layers; every other brand fills its single path with the
 * partner's `logoColor` (the official hex where it reads on the dark UI, white
 * for monochrome-dark brands).
 */
export function PartnerMark({
  partner,
  size = 20,
  className = '',
}: {
  partner: ResolvedPartner
  size?: number
  className?: string
}) {
  const multi = MULTICOLOR_MARKS[partner.logo]
  if (multi) {
    return (
      <svg width={size} height={size} viewBox={multi.viewBox} aria-hidden className={className}>
        {multi.layers.map((l) => (
          <path key={l.fill} d={l.d} fill={l.fill} />
        ))}
      </svg>
    )
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={partner.mark.viewBox}
      fill={partner.logoColor}
      aria-hidden
      className={className}
    >
      <path d={partner.mark.path} />
    </svg>
  )
}
