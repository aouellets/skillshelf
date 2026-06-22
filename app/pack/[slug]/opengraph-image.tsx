import { ImageResponse } from 'next/og'
import { getPackBySlug } from '@/lib/packs'
import { installLabel } from '@/lib/categories'
import {
  OG,
  OG_SIZE,
  OG_CONTENT_TYPE,
  loadBrandFonts,
  Lockup,
  Pill,
  SkillChip,
  fitSkillChips,
  truncateWords,
  headlineSize,
} from '@/lib/og/brand'

export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const dynamic = 'force-dynamic'
export const alt = 'Skill Me pack'

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const pack = await getPackBySlug(slug)
  const fonts = await loadBrandFonts()

  const name = pack?.name ?? 'Skill Me'
  const tagline = pack?.tagline ?? 'A themed bundle of curated Claude skills.'
  const skillCount = pack?.skill_count ?? 0
  const installs = pack ? installLabel(pack.install_count) : null

  // The headline contents: the actual skills in the pack, when we have them.
  // Pack to at most two rows so the footer always stays on-canvas.
  const skillNames = (pack?.skills ?? []).map((s) => truncateWords(s.name, 30)).filter(Boolean)
  const shown = fitSkillChips(skillNames, skillCount)
  const remaining = skillCount - shown.length
  // A long name forced onto two lines would blow the height budget once chips
  // are present, so cap the headline tighter when we're listing contents.
  const nameSize = Math.min(headlineSize(name), shown.length > 0 ? 80 : 94)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: OG.void,
          fontFamily: 'Inter',
          padding: 76,
          paddingTop: 70,
          position: 'relative',
        }}
      >
        {/* vermilion signature bar along the very top */}
        <div
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 8, backgroundColor: OG.accent }}
        />

        {/* header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
          }}
        >
          <Lockup />
          <Pill tone="accent">Skill Pack</Pill>
        </div>

        {/* eyebrow + pack name + tagline + contents */}
        <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <div
            style={{
              display: 'flex',
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: 4,
              textTransform: 'uppercase',
              color: OG.accent,
              marginBottom: 22,
            }}
          >
            {`${skillCount} skills, one install`}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: nameSize,
              fontWeight: 800,
              letterSpacing: -2,
              lineHeight: 1.02,
              color: OG.text,
            }}
          >
            {name}
          </div>
          <div
            style={{
              display: 'flex',
              marginTop: 20,
              fontSize: 31,
              lineHeight: 1.3,
              color: OG.secondary,
              maxWidth: 1040,
            }}
          >
            {truncateWords(tagline, 104)}
          </div>

          {/* the actual skills in the pack */}
          {shown.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 30, maxWidth: 1048 }}>
              {shown.map((n) => (
                <SkillChip key={n}>{n}</SkillChip>
              ))}
              {remaining > 0 && <SkillChip muted>{`+${remaining} more`}</SkillChip>}
            </div>
          )}
        </div>

        {/* footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', fontSize: 28, color: OG.secondary }}>
            {installs ?? 'Install the whole set in one command'}
          </div>
          <div style={{ display: 'flex', fontSize: 28, fontWeight: 700, color: OG.accent }}>
            Install on skillme.dev
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts }
  )
}
