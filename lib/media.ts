import 'server-only'
import { getSupabase } from './supabase'
import type { MediaAsset, MediaSubjectType } from './types'

/**
 * Demo-video lookups (table `media_assets`, migration 0009). Videos are produced
 * out-of-band by the skillme-demos pipeline, so there is no seed fallback — when
 * a subject has no row (or Supabase is unconfigured) the UI simply omits its Demo
 * section.
 *
 * These are uncached, single indexed lookups on already-`force-dynamic` pages:
 * cheap, and crucially always fresh. (An earlier `unstable_cache` here served
 * hour-stale empty results after a publish run, since the external pipeline has
 * no way to call `revalidateTag` — not worth the micro-optimization.)
 */

async function queryForSubject(
  subjectType: MediaSubjectType,
  subjectSlug: string,
): Promise<MediaAsset[]> {
  const supabase = getSupabase()
  if (!supabase) return []
  const { data, error } = await supabase
    .from('media_assets')
    .select('*')
    .eq('subject_type', subjectType)
    .eq('subject_slug', subjectSlug)
  if (error || !data) {
    if (error) console.error('[media] subject query failed:', error.message)
    return []
  }
  return data as MediaAsset[]
}

/** The landscape demo for a pack or skill (the common case). Null when absent. */
export async function getDemo(
  subjectType: 'pack' | 'skill',
  subjectSlug: string,
): Promise<MediaAsset | null> {
  const rows = await queryForSubject(subjectType, subjectSlug)
  return rows.find((r) => r.orientation === 'landscape') ?? null
}

/** Both platform orientations, as a convenient pair. */
export async function getPlatformDemos(): Promise<{
  landscape: MediaAsset | null
  portrait: MediaAsset | null
}> {
  const rows = await queryForSubject('platform', 'skillme')
  return {
    landscape: rows.find((r) => r.orientation === 'landscape') ?? null,
    portrait: rows.find((r) => r.orientation === 'portrait') ?? null,
  }
}

/** Map of slug → landscape demo, for a pack's member-skill gallery. */
export async function getDemosForSkillSlugs(
  slugs: string[],
): Promise<Map<string, MediaAsset>> {
  if (slugs.length === 0) return new Map()
  const supabase = getSupabase()
  if (!supabase) return new Map()
  const { data, error } = await supabase
    .from('media_assets')
    .select('*')
    .eq('subject_type', 'skill')
    .eq('orientation', 'landscape')
    .in('subject_slug', slugs)
  if (error || !data) {
    if (error) console.error('[media] slugs query failed:', error.message)
    return new Map()
  }
  return new Map((data as MediaAsset[]).map((r) => [r.subject_slug, r]))
}
