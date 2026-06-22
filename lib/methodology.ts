/**
 * Methodology badges — DISTINCT from `partners.ts`.
 *
 * A partner logo asserts "authored by / official skill from <company>". A
 * methodology badge asserts only that the content *applies* a named training
 * methodology, used descriptively (adjective + registered symbol). It does NOT
 * imply authorship, sponsorship, partnership, or endorsement by the brand.
 *
 * Current uses, both matched on a catalog tag:
 *   - CrossFit® methodology content from a licensed CrossFit affiliate
 *     (see the crossfit-claude-skills repo). Tag: `crossfit`.
 *   - HYROX race-format content from a licensed HYROX affiliate
 *     (see the hyrox-claude-skills repo). Tag: `hyrox`. Carries the licensed
 *     HYROX wordmark so the badge/art lead with the real mark.
 */
export interface Methodology {
  /** Short badge label (with a registered mark where applicable). */
  label: string
  /** Tooltip / accessible description. */
  title: string
  /** Source/reference URL. */
  url: string
  /** Brand accent for the art hero/glow (defaults to the CrossFit orange). */
  accent?: string
  /** Dark brand tint for the top of the art backdrop. */
  tint?: string
  /**
   * Optional vector wordmark rendered as the art hero instead of the text
   * label. Used where we hold a license to display the actual mark (HYROX).
   * Single currentColor-style path; filled with `accent`.
   */
  markPath?: string
  /** viewBox for `markPath`. */
  markViewBox?: string
}

const CROSSFIT: Methodology = {
  label: 'CrossFit®',
  title:
    'Applies the CrossFit® methodology — by a licensed CrossFit affiliate. Independent; not endorsed, sponsored, or certified by CrossFit, LLC.',
  url: 'https://github.com/aouellets/crossfit-claude-skills',
}

// HYROX official wordmark (520x72), used under the operator's HYROX affiliate
// license. Five letter outlines merged into one path; filled with the accent.
const HYROX_WORDMARK =
  'M0,1.784 L11.784,1.784 L11.784,30.951 L40.264,30.951 L40.264,1.784 L52.049,1.784 L52.049,70.527 L40.264,70.527 L40.264,41.262 L11.784,41.262 L11.784,70.527 L0,70.527 L0,1.784 M140.324,43.325 L117.05,5.712 L117.05,1.784 L128.637,1.784 L146.313,32.227 L164.58,1.784 L175.384,1.784 L175.384,5.712 L152.108,42.833 L152.108,70.527 L140.324,70.527 L140.324,43.325 M265.623,34.093 C272.499,34.093 276.525,30.754 276.525,23.095 C276.525,15.434 272.499,12.096 265.623,12.096 L250.009,12.096 L250.009,34.093 L265.623,34.093 z M238.224,1.784 L267.784,1.784 C281.337,1.784 288.505,9.739 288.505,22.898 C288.505,31.834 284.577,39.298 276.427,42.736 L289.291,66.599 L289.291,70.527 L277.704,70.527 L263.561,44.11 L250.009,44.11 L250.009,70.527 L238.224,70.527 L238.224,1.784 M392.888,47.841 L392.888,24.469 C392.888,17.104 387.878,11.113 377.665,11.113 C367.451,11.113 362.443,17.104 362.443,24.469 L362.443,47.841 C362.443,55.207 367.451,61.198 377.665,61.198 C387.878,61.198 392.888,55.207 392.888,47.841 z M350.658,47.253 L350.658,25.058 C350.658,9.444 361.166,0.311 377.665,0.311 C394.163,0.311 404.672,9.444 404.672,25.058 L404.672,47.253 C404.672,62.868 394.163,72 377.665,72 C361.166,72 350.658,62.868 350.658,47.253 M461.816,66.599 L483.323,34.977 L463.486,5.712 L463.486,1.784 L475.467,1.784 L490.688,25.746 L506.598,1.784 L517.891,1.784 L517.891,5.712 L497.858,34.879 L519.56,66.599 L519.56,70.527 L507.579,70.527 L490.394,44.406 L473.109,70.527 L461.816,70.527 L461.816,66.599'

const HYROX: Methodology = {
  label: 'HYROX',
  title:
    'Trains for the HYROX race format — by a licensed HYROX affiliate. Independent; not separately endorsed, sponsored, or certified by HYROX World GmbH.',
  url: 'https://github.com/aouellets/hyrox-claude-skills',
  accent: '#ffd400',
  tint: '#231f00',
  markPath: HYROX_WORDMARK,
  markViewBox: '0 0 520 72',
}

/** Tag → methodology. First match wins. */
const BY_TAG: Array<{ tag: string; methodology: Methodology }> = [
  { tag: 'crossfit', methodology: CROSSFIT },
  { tag: 'hyrox', methodology: HYROX },
]

/** Resolve a methodology badge from a skill/pack's tags, or null. */
export function getMethodology(tags?: string[] | null): Methodology | null {
  if (!tags || tags.length === 0) return null
  for (const { tag, methodology } of BY_TAG) {
    if (tags.includes(tag)) return methodology
  }
  return null
}

/** True when the subject carries a methodology badge. */
export function hasMethodology(tags?: string[] | null): boolean {
  return getMethodology(tags) !== null
}
