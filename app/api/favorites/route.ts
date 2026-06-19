import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getServiceSupabase } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Resolve the signed-in user's stable token, or null if not signed in. */
async function userToken(): Promise<string | null> {
  const auth = await createSupabaseServerClient()
  if (!auth) return null
  const {
    data: { user },
  } = await auth.auth.getUser()
  return user ? `auth:${user.id}` : null
}

// GET /api/favorites — the skill IDs the signed-in user has favorited.
// Returns an empty list for signed-out users (never an error) so the client
// favorites provider can render hearts unfilled without special-casing auth.
export async function GET() {
  const token = await userToken()
  if (!token) return Response.json({ skill_ids: [] })

  const service = getServiceSupabase()
  if (!service) return Response.json({ skill_ids: [] })

  const { data, error } = await service
    .from('user_favorites')
    .select('skill_id')
    .eq('user_token', token)

  if (error) {
    if (error.code === '42P01') return Response.json({ skill_ids: [] })
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ skill_ids: (data ?? []).map((r) => r.skill_id as string) })
}

// POST /api/favorites — set the favorited state for a skill.
// Body: { skill_id, favorited } where favorited is the desired end state.
export async function POST(req: NextRequest) {
  const token = await userToken()
  if (!token) {
    return Response.json({ error: 'Sign in to save skills.' }, { status: 401 })
  }

  let body: { skill_id?: string; favorited?: boolean }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  if (!body.skill_id || typeof body.favorited !== 'boolean') {
    return Response.json(
      { error: 'A skill_id and a boolean favorited state are required.' },
      { status: 400 }
    )
  }

  const service = getServiceSupabase()
  if (!service) {
    return Response.json({ error: 'Database is not configured.' }, { status: 503 })
  }

  if (body.favorited) {
    const { error } = await service
      .from('user_favorites')
      .upsert(
        { user_token: token, skill_id: body.skill_id },
        { onConflict: 'user_token,skill_id' }
      )
    if (error) return Response.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await service
      .from('user_favorites')
      .delete()
      .eq('user_token', token)
      .eq('skill_id', body.skill_id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ ok: true, favorited: body.favorited })
}
