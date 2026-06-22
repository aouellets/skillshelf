/**
 * Branded placeholder art for methodology content (e.g. the CrossFit®
 * methodology pack/skills, the HYROX race-format pack), mirroring
 * `partner-art.ts`. Where `category-art.ts` paints a generic category scene,
 * this leads with the *methodology mark* as the hero — descriptive use, NOT a
 * partner/authored-by claim (see `methodology.ts`). Used by
 * `components/SkillThumbnail.tsx` when an item is methodology-tagged and has no
 * media.
 *
 * For CrossFit the hero is a text wordmark (nominative). For HYROX, where we
 * hold an affiliate license to display the mark, the hero is the actual HYROX
 * wordmark vector.
 */
import { getMethodology } from './methodology'

const VOID = '#080a0a'
const DEFAULT_ACCENT = '#ee4628'
const DEFAULT_TINT = '#2a1109'

export function hasMethodologyArt(tags?: string[] | null): boolean {
  return getMethodology(tags) !== null
}

function hashSeed(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Self-contained branded SVG leading with the methodology mark. 16:9 viewBox
 * that fills its container (slice), matching the other thumbnail art. Returns ''
 * when the item carries no methodology (callers fall back to category art).
 */
export function methodologyThumbnailSvg(tags?: string[] | null, seed?: string): string {
  const m = getMethodology(tags)
  if (!m) return ''

  const ACCENT = m.accent ?? DEFAULT_ACCENT
  const TINT = m.tint ?? DEFAULT_TINT
  const MARK = m.markColor ?? ACCENT
  const uid = `m${hashSeed(`${m.label}${seed ?? ''}`).toString(36)}`
  const cx = 160
  const cy = 80

  // Hero: a licensed vector wordmark (HYROX) if present, else the text label.
  let hero: string
  if (m.markPath) {
    const [, , vw, vh] = (m.markViewBox ?? '0 0 520 72').split(/\s+/).map(Number)
    // Wordmarks are wide/short — fill ~84% of the 320-wide frame so the mark is
    // the clear hero rather than a small label ringed by the orbit circles.
    const targetW = 270
    const scale = targetW / vw
    const w = vw * scale
    const h = vh * scale
    hero = `<g transform="translate(${cx - w / 2} ${cy - h / 2}) scale(${scale})"><path d="${m.markPath}" fill="${MARK}"/></g>`
  } else {
    // "CrossFit®" → split the registered symbol out so it renders as a superscript.
    const mark = m.label.replace(/®/g, '')
    const hasReg = m.label.includes('®')
    hero = `<text x="${cx}" y="${cy + 10}" text-anchor="middle" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-weight="800" font-size="40" letter-spacing="-0.5" fill="${MARK}">${mark}${hasReg ? `<tspan font-size="16" dy="-14">®</tspan>` : ''}</text>`
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Applies the ${m.label} methodology">
  <defs>
    <radialGradient id="mbg-${uid}" cx="50%" cy="-4%" r="120%">
      <stop offset="0%" stop-color="${TINT}"/>
      <stop offset="80%" stop-color="${VOID}"/>
    </radialGradient>
    <radialGradient id="mglow-${uid}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${ACCENT}" stop-opacity="0.30"/>
      <stop offset="55%" stop-color="${ACCENT}" stop-opacity="0.09"/>
      <stop offset="100%" stop-color="${ACCENT}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="mdot-${uid}" width="13" height="13" patternUnits="userSpaceOnUse">
      <circle cx="1" cy="1" r="1" fill="${ACCENT}" opacity="0.05"/>
    </pattern>
    <linearGradient id="mscrim-${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="52%" stop-color="${VOID}" stop-opacity="0"/>
      <stop offset="100%" stop-color="${VOID}" stop-opacity="0.62"/>
    </linearGradient>
  </defs>

  <rect width="320" height="180" fill="url(#mbg-${uid})"/>
  <rect width="320" height="180" fill="url(#mdot-${uid})"/>

  <ellipse cx="${cx}" cy="${cy}" rx="92" ry="58" fill="url(#mglow-${uid})">
    <animate attributeName="opacity" values="0.6;1;0.6" dur="5.5s" repeatCount="indefinite"/>
  </ellipse>

  <g fill="none" stroke="${ACCENT}" stroke-linecap="round">
    <circle cx="${cx}" cy="${cy}" r="52" stroke-width="1" stroke-opacity="0.22" stroke-dasharray="3 7">
      <animateTransform attributeName="transform" type="rotate" from="0 ${cx} ${cy}" to="360 ${cx} ${cy}" dur="30s" repeatCount="indefinite"/>
    </circle>
    <circle cx="${cx}" cy="${cy}" r="68" stroke-width="1" stroke-opacity="0.11" stroke-dasharray="1 9">
      <animateTransform attributeName="transform" type="rotate" from="360 ${cx} ${cy}" to="0 ${cx} ${cy}" dur="46s" repeatCount="indefinite"/>
    </circle>
  </g>

  <!-- hero mark -->
  ${hero}

  <rect width="320" height="180" fill="url(#mscrim-${uid})"/>
  <text x="160" y="140" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="11" letter-spacing="3" fill="${ACCENT}" opacity="0.78">METHODOLOGY</text>
</svg>`
}
