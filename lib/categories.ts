import type { PackCategory, SkillCategory } from './types'

export interface CategoryMeta {
  slug: SkillCategory
  label: string
  color: string
}

export const CATEGORIES: CategoryMeta[] = [
  { slug: 'coding', label: 'Coding', color: 'var(--cat-coding)' },
  { slug: 'writing', label: 'Writing', color: 'var(--cat-writing)' },
  { slug: 'research', label: 'Research', color: 'var(--cat-research)' },
  { slug: 'productivity', label: 'Productivity', color: 'var(--cat-productivity)' },
  { slug: 'data', label: 'Data', color: 'var(--cat-data)' },
  { slug: 'design', label: 'Design', color: 'var(--cat-design)' },
  { slug: 'business', label: 'Business', color: 'var(--cat-business)' },
  { slug: 'personal', label: 'Personal', color: 'var(--cat-personal)' },
]

export const CATEGORY_MAP: Record<SkillCategory, CategoryMeta> = CATEGORIES.reduce(
  (acc, c) => {
    acc[c.slug] = c
    return acc
  },
  {} as Record<SkillCategory, CategoryMeta>
)

export function isCategory(value: string): value is SkillCategory {
  return CATEGORIES.some((c) => c.slug === value)
}

// Packs add a "mixed" category on top of the skill categories.
export const PACK_CATEGORIES: { slug: PackCategory; label: string }[] = [
  ...CATEGORIES.map((c) => ({ slug: c.slug as PackCategory, label: c.label })),
  { slug: 'mixed', label: 'Mixed' },
]

export function isPackCategory(value: string): value is PackCategory {
  return PACK_CATEGORIES.some((c) => c.slug === value)
}

export function formatInstalls(count: number): string {
  if (count >= 1000) {
    const k = count / 1000
    return `${k >= 100 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, '')}k`
  }
  return String(count)
}

/**
 * Full "N installs" label, or null when there is no real install data to show.
 *
 * Hide-until-real: install counts are runtime-accumulated, so a skill/pack with
 * zero real installs shows no count at all (the "New" badge covers fresh items)
 * rather than a fabricated or hollow "0 installs". This is the single place that
 * decides whether an install count is worth showing.
 */
export function installLabel(count: number): string | null {
  if (!count || count <= 0) return null
  return `${formatInstalls(count)} install${count === 1 ? '' : 's'}`
}

/** A skill is "new" if it was added within the last 14 days. Client-safe. */
export function isNewSkill(createdAt: string): boolean {
  const age = Date.now() - Date.parse(createdAt)
  return age < 14 * 24 * 60 * 60 * 1000 // 14 days
}
