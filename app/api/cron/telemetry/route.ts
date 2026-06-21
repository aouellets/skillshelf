import { NextRequest } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Refresh the telemetry rollup materialized views (see
 * supabase/migrations/0008_telemetry_rollups.sql).
 *
 * Triggered by Vercel Cron (see vercel.json) or any scheduler. Protected by
 * CRON_SECRET exactly like /api/cron/recompute: an `Authorization: Bearer
 * <secret>` header (Vercel Cron sends this) or `?secret=<secret>`. When
 * CRON_SECRET is unset the endpoint is open — set it in production.
 */
async function handle(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    const qp = req.nextUrl.searchParams.get('secret')
    if (auth !== `Bearer ${secret}` && qp !== secret) {
      return Response.json({ error: 'Unauthorized.' }, { status: 401 })
    }
  }

  const supabase = getServiceSupabase()
  if (!supabase) return Response.json({ error: 'Database not configured.' }, { status: 503 })

  const { error } = await supabase.rpc('refresh_telemetry_rollups')
  if (error) {
    console.error('[cron/telemetry] rpc error:', error.message)
    return Response.json({ error: error.message }, { status: 500 })
  }
  return Response.json({ ok: true, refreshed_at: new Date().toISOString() })
}

export const GET = handle
export const POST = handle
