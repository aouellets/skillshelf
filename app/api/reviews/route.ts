import { NextRequest } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getServiceSupabase } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BODY = 2000

/** Best-effort display name from the auth profile; never the raw email. */
function displayName(user: User): string {
  const m = (user.user_metadata ?? {}) as Record<string, unknown>
  const candidate =
    (m.user_name as string) ||
    (m.preferred_username as string) ||
    (m.name as string) ||
    (m.full_name as string)
  return candidate?.trim() || 'Anonymous'
}

/**
 * Upsert the signed-in user's written review for a skill. The numeric rating is
 * also written to user_installs so the public average (recompute_skill_rating)
 * keeps a single source of truth — this table only adds the review text + author.
 */
export async function POST(req: NextRequest) {
  const auth = await createSupabaseServerClient()
  if (!auth) {
    return Response.json({ error: 'Auth is not configured.' }, { status: 503 })
  }

  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Sign in to review skills.' }, { status: 401 })
  }

  let body: { skill_id?: string; rating?: number; body?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const rating = Number(body.rating)
  const text = body.body?.trim()
  if (!body.skill_id || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return Response.json(
      { error: 'A skill_id and an integer rating from 1 to 5 are required.' },
      { status: 400 }
    )
  }
  if (!text || text.length < 4) {
    return Response.json({ error: 'Write a few words for your review.' }, { status: 400 })
  }
  if (text.length > MAX_BODY) {
    return Response.json({ error: `Reviews are limited to ${MAX_BODY} characters.` }, { status: 400 })
  }

  const service = getServiceSupabase()
  if (!service) {
    return Response.json({ error: 'Database is not configured.' }, { status: 503 })
  }

  const userToken = `auth:${user.id}`
  const now = new Date().toISOString()

  const { error: reviewError } = await service.from('skill_reviews').upsert(
    {
      user_token: userToken,
      skill_id: body.skill_id,
      rating,
      body: text,
      author_name: displayName(user),
      updated_at: now,
    },
    { onConflict: 'user_token,skill_id' }
  )
  if (reviewError) {
    return Response.json({ error: reviewError.message }, { status: 500 })
  }

  // Keep the numeric rating in user_installs so the catalog average stays the
  // single source of truth (mirrors /api/rate).
  await service.from('user_installs').upsert(
    {
      user_token: userToken,
      skill_id: body.skill_id,
      rating,
      updated_at: now,
    },
    { onConflict: 'user_token,skill_id' }
  )
  await service.rpc('recompute_skill_rating', { p_skill_id: body.skill_id })

  const { data: skill } = await service
    .from('skills')
    .select('rating_avg, rating_count')
    .eq('id', body.skill_id)
    .single()

  return Response.json({
    ok: true,
    rating,
    rating_avg: skill?.rating_avg ?? null,
    rating_count: skill?.rating_count ?? null,
  })
}
