/**
 * Per-category placeholder art. Single source of truth for both the runtime
 * thumbnail fallback (`components/SkillThumbnail.tsx`) and the static SVG files
 * emitted to `public/category/<key>.svg` (`scripts/generate-category-art.ts`).
 *
 * Each category gets its brand color (mirrors the `--cat-*` tokens), a dark
 * tint for the radial backdrop, a label, and a stroked line icon. The art is a
 * pure SVG string so it renders identically inline and on disk.
 */
export type CategoryArtKey =
  | 'coding' | 'writing' | 'research' | 'productivity'
  | 'data' | 'design' | 'business' | 'personal' | 'mixed'

export interface CategoryArt {
  /** Foreground brand color (matches --cat-* tokens). */
  fg: string
  /** Dark tint for the top of the radial backdrop. */
  bg: string
  /** Display label rendered under the icon. */
  label: string
  /** Inner SVG markup for the icon, drawn in a 0 0 24 24 box, stroked. */
  icon: string
}

export const CATEGORY_ART: Record<CategoryArtKey, CategoryArt> = {
  coding: {
    fg: '#4fd1d9', bg: '#0e1f21', label: 'Coding',
    icon: '<path d="M10 8 6 12l4 4"/><path d="M14 8l4 4-4 4"/><path d="M13 7l-2 10"/>',
  },
  writing: {
    fg: '#a797ff', bg: '#191428', label: 'Writing',
    icon: '<path d="M15.5 4.5l4 4L9 19l-4.5 1L6 15.5z"/><path d="M13.5 6.5l4 4"/>',
  },
  research: {
    fg: '#6ee787', bg: '#0f2117', label: 'Research',
    icon: '<circle cx="11" cy="11" r="6"/><path d="M15.5 15.5 20 20"/>',
  },
  productivity: {
    fg: '#f5c451', bg: '#1f1a0c', label: 'Productivity',
    icon: '<circle cx="12" cy="12" r="8"/><path d="M8.5 12.5 11 15l4.5-5.5"/>',
  },
  data: {
    fg: '#5b9df9', bg: '#0f1d33', label: 'Data',
    icon: '<path d="M5 19h14"/><rect x="6" y="11" width="3" height="6" rx="0.5"/><rect x="11" y="7" width="3" height="10" rx="0.5"/><rect x="16" y="4" width="3" height="13" rx="0.5"/>',
  },
  design: {
    fg: '#ff8a5c', bg: '#26140c', label: 'Design',
    icon: '<path d="M12 4 20 18H4z"/><circle cx="12" cy="13" r="2.5"/>',
  },
  business: {
    fg: '#df8ad9', bg: '#221024', label: 'Business',
    icon: '<rect x="4" y="8" width="16" height="11" rx="2"/><path d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M4 13h16"/>',
  },
  personal: {
    fg: '#aab4a4', bg: '#16180f', label: 'Personal',
    icon: '<circle cx="12" cy="8" r="3.5"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/>',
  },
  mixed: {
    fg: '#b4f33e', bg: '#16210b', label: 'Collection',
    icon: '<path d="M12 3.5 14 9.5 20 12 14 14.5 12 20.5 10 14.5 4 12 10 9.5z"/><path d="M19 4.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
  },
}

const VOID = '#080a0a'

/** True if a string is a category we have art for. */
export function isCategoryArtKey(value: string | undefined): value is CategoryArtKey {
  return value != null && value in CATEGORY_ART
}

/**
 * A complete, self-contained SVG placeholder for a category. 16:9 viewBox that
 * fills its container (slice), so it works for both card and detail aspects.
 */
export function categoryThumbnailSvg(category: string | undefined): string {
  const key: CategoryArtKey = isCategoryArtKey(category) ? category : 'mixed'
  const art = CATEGORY_ART[key]
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${art.label} placeholder">
  <defs>
    <radialGradient id="cg-${key}" cx="50%" cy="-6%" r="115%">
      <stop offset="0%" stop-color="${art.bg}"/>
      <stop offset="78%" stop-color="${VOID}"/>
    </radialGradient>
    <pattern id="cd-${key}" width="13" height="13" patternUnits="userSpaceOnUse">
      <circle cx="1" cy="1" r="1" fill="${art.fg}" opacity="0.05"/>
    </pattern>
  </defs>
  <rect width="320" height="180" fill="url(#cg-${key})"/>
  <rect width="320" height="180" fill="url(#cd-${key})"/>
  <g transform="translate(136 50) scale(2)" fill="none" stroke="${art.fg}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity="0.92">${art.icon}</g>
  <text x="160" y="134" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="11" letter-spacing="3" fill="${art.fg}" opacity="0.7">${art.label.toUpperCase()}</text>
</svg>`
}
