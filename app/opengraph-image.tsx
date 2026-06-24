import { ImageResponse } from 'next/og'
import {
  OG,
  OG_SIZE,
  OG_CONTENT_TYPE,
  CATEGORY_COLORS,
  loadBrandFonts,
  Lockup,
  Check,
  Star,
  truncateWords,
} from '@/lib/og/brand'
import { getSkills, getSkillCount, formatSkillCount } from '@/lib/data'
import { getPacks } from '@/lib/packs'
import { CATEGORY_MAP } from '@/lib/categories'
import type { Skill } from '@/lib/types'

export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const dynamic = 'force-dynamic'
export const alt = 'Skill Me, the App Store for Claude Skills'

const CARDS = 3

/** Round-robin across categories so the featured shelf spans the brand spectrum
 *  instead of three same-category cards. */
function pickDiverse(skills: Skill[], n: number): Skill[] {
  const byCat = new Map<string, Skill[]>()
  const seen = new Set<string>()
  for (const s of skills) {
    if (seen.has(s.slug)) continue
    seen.add(s.slug)
    if (!byCat.has(s.category)) byCat.set(s.category, [])
    byCat.get(s.category)!.push(s)
  }
  const cats = [...byCat.keys()]
  const out: Skill[] = []
  for (let i = 0; out.length < n && cats.some((c) => byCat.get(c)!.length); i++) {
    const bucket = byCat.get(cats[i % cats.length])!
    if (bucket.length) out.push(bucket.shift()!)
  }
  return out
}

export default async function Image() {
  const [fonts, skillCount, packPage, featured, trending] = await Promise.all([
    loadBrandFonts(),
    getSkillCount(),
    getPacks({ limit: 1 }),
    getSkills({ featured: true, limit: 40 }),
    getSkills({ sort: 'hot', limit: 30 }),
  ])

  // Exclude the platform's own meta-listing so the shelf showcases real skills.
  const pool = [...featured.skills, ...trending.skills].filter((s) => s.slug !== 'skillme')
  const cards = pickDiverse(pool, CARDS)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          backgroundColor: OG.void,
          fontFamily: 'Inter',
          padding: 72,
          position: 'relative',
        }}
      >
        {/* vermilion signature bar + a soft warm glow behind the tile shelf */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 8, backgroundColor: OG.accent }} />
        <div
          style={{
            position: 'absolute',
            top: -160,
            right: -120,
            width: 620,
            height: 620,
            borderRadius: 9999,
            background: 'radial-gradient(circle at center, rgba(238,70,40,0.16), rgba(238,70,40,0))',
          }}
        />

        {/* left column: lockup, headline + proof, CTA */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: 560,
            paddingRight: 36,
            position: 'relative',
          }}
        >
          <Lockup mark={62} word={34} />

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                display: 'flex',
                fontSize: 66,
                fontWeight: 800,
                letterSpacing: -2.5,
                lineHeight: 1.04,
                color: OG.text,
              }}
            >
              The App Store for Claude skills.
            </div>
            <div
              style={{
                display: 'flex',
                marginTop: 24,
                fontSize: 30,
                lineHeight: 1.32,
                color: OG.secondary,
                maxWidth: 520,
              }}
            >
              Connect once, install anything. Claude just knows how.
            </div>

            {/* social proof */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 30 }}>
              <Stat value={formatSkillCount(skillCount)} label="skills" />
              <Stat value={formatSkillCount(packPage.total)} label="packs" />
              <Stat value="free" label="to start" accent />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 30, fontWeight: 700, color: OG.accent }}>
            skillme.dev
            <span style={{ display: 'flex', color: OG.secondary, fontWeight: 400 }}>→</span>
          </div>
        </div>

        {/* right column: a "Featured" shelf of real skill cards */}
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22, width: 486 }}>
            {cards.map((s) => {
              const color = CATEGORY_COLORS[s.category] ?? OG.accent
              const catLabel = CATEGORY_MAP[s.category]?.label ?? ''
              const rating = s.rating_count > 0 ? s.rating_avg.toFixed(1) : null
              return (
                <div
                  key={s.slug}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 24,
                    backgroundColor: OG.surfaceRaised,
                    border: `1px solid ${OG.border}`,
                    borderRadius: 30,
                    padding: 26,
                    boxShadow: '0 12px 26px rgba(0,0,0,0.36)',
                  }}
                >
                  {/* glossy category-color app-icon tile (no letters): a small
                      bar mark echoing the brand logo so it reads as a crafted icon */}
                  <div
                    style={{
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      gap: 7,
                      paddingLeft: 22,
                      width: 92,
                      height: 92,
                      borderRadius: 24,
                      backgroundColor: color,
                      boxShadow: '0 6px 16px rgba(0,0,0,0.42)',
                    }}
                  >
                    <div style={{ width: 38, height: 11, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.32)' }} />
                    <div style={{ width: 48, height: 11, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.92)' }} />
                    <div style={{ width: 29, height: 11, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.32)' }} />
                    {/* sheen + rim so the tile has the same crafted depth as the logo */}
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: 24,
                        background:
                          'linear-gradient(157deg, rgba(255,255,255,0.26), rgba(255,255,255,0.04) 46%, rgba(0,0,0,0.20))',
                      }}
                    />
                    <div style={{ position: 'absolute', inset: 0, borderRadius: 24, border: '1px solid rgba(255,255,255,0.18)' }} />
                  </div>

                  {/* real skill name + category + signal */}
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        maxWidth: 304,
                        fontSize: 31,
                        fontWeight: 700,
                        letterSpacing: -0.6,
                        lineHeight: 1.1,
                        color: OG.text,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {truncateWords(s.name, 24)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 11, fontSize: 23 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: OG.secondary }}>
                        <div style={{ width: 11, height: 11, borderRadius: 999, backgroundColor: color }} />
                        {catLabel}
                      </div>
                      {s.verified ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: OG.accent }}>
                          <Check size={20} /> Verified
                        </div>
                      ) : rating ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: OG.secondary }}>
                          <Star size={18} /> {rating}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts }
  )
}

function Stat({ value, label, accent = false }: { value: string; label: string; accent?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 8,
        border: `1px solid ${accent ? OG.accentDim : OG.border}`,
        backgroundColor: accent ? 'rgba(238,70,40,0.10)' : OG.surface,
        borderRadius: 14,
        padding: '11px 16px',
      }}
    >
      <div style={{ display: 'flex', fontSize: 26, fontWeight: 800, color: accent ? OG.accent : OG.text }}>{value}</div>
      <div style={{ display: 'flex', fontSize: 21, color: OG.secondary }}>{label}</div>
    </div>
  )
}
