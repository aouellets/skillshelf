import { Suspense } from 'react'
import type { Metadata } from 'next'
import { PacksClient } from './PacksClient'
import { getPacksBySlugs } from '@/lib/packs'
import { PACK_DEFINITIONS } from '@/lib/pack-definitions'
import { PARTNER_STRIP, isPartner } from '@/lib/partners'
import { isPackCategory } from '@/lib/categories'
import type { PackCategory } from '@/lib/types'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Skill Packs',
  description:
    'Curated bundles of Claude skills. Search and filter themed sets, then install in one command. Solo Founder Stack, Engineering Workflow, Content Marketing Engine, and more.',
  openGraph: {
    title: 'Skill Packs · Skill Me',
    description: 'Search, filter, and install a full themed skill bundle in one Claude command.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Skill Packs · Skill Me',
    description: 'Search, filter, and install a full themed skill bundle in one Claude command.',
  },
}

export default async function PacksPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>
}) {
  const params = await searchParams
  const initialQuery = params.q ?? ''
  const initialCategory: PackCategory | 'all' =
    params.category && isPackCategory(params.category) ? params.category : 'all'

  // Every pack authored by a known partner belongs in the official showcase —
  // not just the curated marquee subset. Lead with the marquee order (headline
  // brands first), then append any remaining partner packs.
  const stripSlugs = PARTNER_STRIP.map((p) => p.packSlug)
  const officialPackSlugs = [
    ...stripSlugs,
    ...PACK_DEFINITIONS.filter((p) => isPartner(p.author) && !stripSlugs.includes(p.slug)).map(
      (p) => p.slug
    ),
  ]

  const officialPacks = await getPacksBySlugs(officialPackSlugs)

  return (
    <Suspense fallback={null}>
      <PacksClient
        officialPacks={officialPacks}
        initialQuery={initialQuery}
        initialCategory={initialCategory}
      />
    </Suspense>
  )
}
