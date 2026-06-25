import { NextRequest } from 'next/server'
import { getSkills, type SortOption } from '@/lib/data'
import { CATEGORIES } from '@/lib/categories'
import type { Skill, SkillCategory } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SORTS: SortOption[] = ['trending', 'newest', 'top_rated', 'hot']

// Top-N skills per category, in one response, for the Browse landing shelves.
// Each category is a "section" the user scrolls between; the cards within it are
// a horizontal rail on mobile. Server-side fan-out keeps it to one client round-trip.
const PER_CATEGORY = 10

export async function GET(req: NextRequest) {
  const sortParam = req.nextUrl.searchParams.get('sort') ?? 'trending'
  const sort = (SORTS.includes(sortParam as SortOption) ? sortParam : 'trending') as SortOption

  const strip = (s: Skill) => {
    const { skill_content, ...rest } = s
    void skill_content
    return rest
  }

  try {
    const results = await Promise.all(
      CATEGORIES.map(async (cat) => {
        const { skills } = await getSkills({ category: cat.slug, sort, limit: PER_CATEGORY })
        return { category: cat.slug, skills: skills.map(strip) }
      })
    )
    // Drop empty categories so the page never renders a bare header.
    const groups = results.filter((g) => g.skills.length > 0)
    return Response.json({ groups })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: message, groups: [] as { category: SkillCategory }[] }, { status: 500 })
  }
}
