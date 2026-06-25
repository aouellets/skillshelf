'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SkillCard } from '@/components/SkillCard'
import { CardRail } from '@/components/CardRail'
import { Reveal } from '@/components/Reveal'
import { SearchBar } from '@/components/SearchBar'
import { CategoryFilter } from '@/components/CategoryFilter'
import { CATEGORY_MAP } from '@/lib/categories'
import type { Skill, SkillCategory } from '@/lib/types'

type SkillSummary = Omit<Skill, 'skill_content'>
type Sort = 'hot' | 'trending' | 'newest' | 'top_rated'

const PAGE_SIZE = 12
const SORTS: Array<{ value: Sort; label: string }> = [
  { value: 'hot', label: 'Hot' },
  { value: 'trending', label: 'Trending' },
  { value: 'newest', label: 'Newest' },
  { value: 'top_rated', label: 'Top Rated' },
]

export function BrowseClient({
  initialCategory,
  initialQuery,
  initialSort = 'trending',
}: {
  initialCategory: SkillCategory | 'all'
  initialQuery: string
  initialSort?: Sort
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [query, setQuery] = useState(initialQuery)
  const [category, setCategory] = useState<SkillCategory | 'all'>(initialCategory)
  const [sort, setSort] = useState<Sort>(initialSort)

  const [skills, setSkills] = useState<SkillSummary[]>([])
  const [related, setRelated] = useState<SkillSummary[]>([])
  const [groups, setGroups] = useState<{ category: SkillCategory; skills: SkillSummary[] }[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requestId = useRef(0)

  // The default, unfiltered view is a set of category shelves (each category is a
  // "section" you scroll between; its cards are a swipeable rail on mobile). The
  // moment a search or a specific category is active we drop to the flat ranked
  // results grid + pagination.
  const isGrouped = query.trim() === '' && category === 'all'

  const fetchPage = useCallback(
    async (offset: number, replace: boolean) => {
      const current = ++requestId.current
      if (replace) setLoading(true)
      else setLoadingMore(true)
      setError(null)

      const params = new URLSearchParams()
      if (query) params.set('q', query)
      if (category !== 'all') params.set('category', category)
      params.set('sort', sort)
      params.set('limit', String(PAGE_SIZE))
      params.set('offset', String(offset))

      try {
        const res = await fetch(`/api/skills?${params.toString()}`)
        if (!res.ok) throw new Error('Failed to load skills')
        const data: { skills: SkillSummary[]; total: number; related?: SkillSummary[] } =
          await res.json()
        if (current !== requestId.current) return // stale response
        setTotal(data.total)
        setSkills((prev) => (replace ? data.skills : [...prev, ...data.skills]))
        // `related` is only computed for the first page; preserve it on load-more.
        if (replace) setRelated(data.related ?? [])
      } catch (err) {
        if (current !== requestId.current) return
        setError(err instanceof Error ? err.message : 'Something went wrong')
      } finally {
        if (current === requestId.current) {
          setLoading(false)
          setLoadingMore(false)
        }
      }
    },
    [query, category, sort]
  )

  // Category shelves for the default view. One request: the endpoint fans out
  // over the categories server-side and returns top-N per category.
  const fetchGroups = useCallback(async () => {
    const current = ++requestId.current
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/skills/grouped?sort=${sort}`)
      if (!res.ok) throw new Error('Failed to load skills')
      const data: { groups: { category: SkillCategory; skills: SkillSummary[] }[] } =
        await res.json()
      if (current !== requestId.current) return // stale response
      setGroups(data.groups)
    } catch (err) {
      if (current !== requestId.current) return
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      if (current === requestId.current) setLoading(false)
    }
  }, [sort])

  // Reload whenever the query, category, or sort changes: grouped shelves in the
  // default view, the flat ranked grid once anything is filtered or searched.
  useEffect(() => {
    if (isGrouped) fetchGroups()
    else fetchPage(0, true)
  }, [isGrouped, fetchGroups, fetchPage])

  // Keep the category reflected in the URL for shareable links.
  useEffect(() => {
    const params = new URLSearchParams(Array.from(searchParams.entries()))
    if (category === 'all') params.delete('category')
    else params.set('category', category)
    const qs = params.toString()
    router.replace(qs ? `/browse?${qs}` : '/browse', { scroll: false })
    // Only react to category changes here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category])

  const hasMore = skills.length < total

  return (
    <div className="mx-auto max-w-content px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl font-semibold tracking-tight text-shelf-text-primary">
        Browse skills
      </h1>
      <p className="mt-3 max-w-xl text-shelf-text-secondary">
        Search the catalog, filter by category, and install from inside Claude.
      </p>

      <div className="mt-8 space-y-5">
        <div className="max-w-md">
          <SearchBar initialValue={initialQuery} onSearch={setQuery} />
        </div>

        <CategoryFilter active={category} onChange={setCategory} />

        <div className="flex items-center gap-3 sm:flex-wrap">
          <span className="shrink-0 font-mono text-xs uppercase tracking-widest text-shelf-text-tertiary">
            Sort
          </span>
          {/* Single scrolling row on mobile (matches the category filter);
              wraps normally at sm+ so desktop is unchanged. */}
          <div className="no-scrollbar flex min-w-0 flex-1 gap-2 overflow-x-auto sm:flex-none sm:flex-wrap sm:overflow-visible">
            {SORTS.map((s) => (
              <button
                key={s.value}
                onClick={() => setSort(s.value)}
                className={`chip shrink-0 !py-1.5 text-xs ${sort === s.value ? 'chip-active' : ''}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8">
        {loading ? (
          <SkeletonGrid />
        ) : error ? (
          <div className="card p-8 text-center">
            <p className="text-shelf-text-secondary">{error}</p>
            <button
              onClick={() => (isGrouped ? fetchGroups() : fetchPage(0, true))}
              className="btn btn-secondary mt-4"
            >
              Try again
            </button>
          </div>
        ) : isGrouped ? (
          // Default view: one shelf per category — vertical scroll between
          // categories, a swipeable rail of skills within each on mobile.
          <div className="space-y-12">
            {groups.map((group) => {
              const meta = CATEGORY_MAP[group.category]
              return (
                <section key={group.category}>
                  <div className="flex items-end justify-between gap-4">
                    <h2 className="flex items-center gap-2.5 font-display text-xl font-semibold text-shelf-text-primary">
                      <span
                        aria-hidden
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: meta.color }}
                      />
                      {meta.label}
                    </h2>
                    <button
                      onClick={() => setCategory(group.category)}
                      className="shrink-0 text-sm text-shelf-text-secondary transition-colors hover:text-accent-hover"
                    >
                      View all →
                    </button>
                  </div>
                  <CardRail
                    ariaLabel={`${meta.label} skills`}
                    gridClassName="mt-5 sm:grid sm:grid-cols-3 sm:gap-5 xl:grid-cols-4 2xl:grid-cols-5"
                    items={group.skills.map((skill, i) => ({
                      key: skill.id,
                      node: (
                        <Reveal index={i} className="h-full">
                          <SkillCard skill={skill} />
                        </Reveal>
                      ),
                    }))}
                  />
                </section>
              )
            })}
          </div>
        ) : skills.length === 0 && related.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-shelf-text-primary">
              No skills found{query ? ` for "${query}"` : ''}.
            </p>
            <p className="mt-1 text-sm text-shelf-text-secondary">Try a broader search.</p>
          </div>
        ) : (
          <>
            {skills.length > 0 && (
              <>
                <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  {skills.map((skill, i) => (
                    <Reveal key={skill.id} index={i} className="h-full">
                      <SkillCard skill={skill} />
                    </Reveal>
                  ))}
                </div>

                {hasMore && (
                  <div className="mt-8 flex justify-center">
                    <button
                      onClick={() => fetchPage(skills.length, false)}
                      disabled={loadingMore}
                      className="btn btn-secondary"
                    >
                      {loadingMore ? 'Loading…' : 'Load more'}
                    </button>
                  </div>
                )}
              </>
            )}

            {related.length > 0 && (
              <div className={skills.length > 0 ? 'mt-12' : ''}>
                <div className="flex items-baseline gap-3">
                  <h2 className="font-display text-lg font-semibold text-shelf-text-primary">
                    {skills.length > 0 ? 'Related matches' : 'No exact matches — related skills'}
                  </h2>
                  <span className="font-mono text-xs uppercase tracking-widest text-shelf-text-tertiary">
                    Semantic
                  </span>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  {related.map((skill, i) => (
                    <Reveal key={skill.id} index={i} className="h-full">
                      <SkillCard skill={skill} />
                    </Reveal>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function SkeletonGrid() {
  // Skeleton mirrors the real SkillCard shape: media banner + title + body + meta.
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="card animate-pulse overflow-hidden">
          <div className="aspect-[16/9] w-full bg-shelf-elevated" />
          <div className="p-3.5 sm:p-5">
            <div className="h-4 w-2/3 rounded-xs bg-shelf-elevated" />
            <div className="mt-3 h-3 w-full rounded-xs bg-shelf-elevated" />
            <div className="mt-2 h-3 w-5/6 rounded-xs bg-shelf-elevated" />
            <div className="mt-4 h-3 w-1/3 rounded-xs bg-shelf-elevated" />
          </div>
        </div>
      ))}
    </div>
  )
}
