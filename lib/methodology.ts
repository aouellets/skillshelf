/**
 * Methodology badges — DISTINCT from `partners.ts`.
 *
 * A partner logo asserts "authored by / official skill from <company>". A
 * methodology badge asserts only that the content *applies* a named training
 * methodology, used descriptively (adjective + registered symbol). It does NOT
 * imply authorship, sponsorship, partnership, or endorsement by the brand.
 *
 * Current use: CrossFit® methodology content from a licensed CrossFit affiliate
 * (see the crossfit-claude-skills repo). Matched on the `crossfit` catalog tag.
 */
export interface Methodology {
  /** Short badge label, with the registered mark. */
  label: string
  /** Tooltip / accessible description. */
  title: string
  /** Brand accent for the chip. */
  url: string
}

const CROSSFIT: Methodology = {
  label: 'CrossFit®',
  title:
    'Applies the CrossFit® methodology — by a licensed CrossFit affiliate. Independent; not endorsed, sponsored, or certified by CrossFit, LLC.',
  url: 'https://github.com/aouellets/crossfit-claude-skills',
}

/** Tag that flags CrossFit® methodology content. */
const CROSSFIT_TAG = 'crossfit'

/** Resolve a methodology badge from a skill/pack's tags, or null. */
export function getMethodology(tags?: string[] | null): Methodology | null {
  if (!tags || tags.length === 0) return null
  return tags.includes(CROSSFIT_TAG) ? CROSSFIT : null
}

/** True when the subject carries a methodology badge. */
export function hasMethodology(tags?: string[] | null): boolean {
  return getMethodology(tags) !== null
}
