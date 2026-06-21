import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getServiceSupabase } from '@/lib/supabase'
import { insertEvents, buildRow, type TelemetryRow } from '@/lib/telemetry/track'
import {
  WEB_EMITTABLE_EVENTS,
  ANONYMOUS_ID_COOKIE,
  validateEventProperties,
  type TelemetryEvent,
  type WebEmittableEvent,
} from '@/lib/telemetry/events'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Web telemetry batch ingest. ADDITIVE to the server-side MCP pipeline — this
 * path carries only the lower-trust, web-browsing events the client buffers
 * (see lib/telemetry/client.ts). Server-authored signals (mcp_*, skill_activated)
 * are rejected: WEB_EMITTABLE_EVENTS gates the accepted names so a browser can't
 * forge MCP usage or active-use.
 *
 * Identity is resolved SERVER-SIDE: user_id from the Supabase session (never
 * trusted from the body), anonymous_id from the first-party cookie, coarse geo
 * from edge headers. NO raw IP is ever stored.
 *
 * Idempotent: every event carries a client idempotency_key; the unique
 * constraint drops duplicates, so replaying a batch inserts each row once.
 */

const MAX_BODY_BYTES = 128 * 1024
const MAX_BATCH = 50

const RawEventSchema = z
  .object({
    name: z.enum(WEB_EMITTABLE_EVENTS as unknown as [string, ...string[]]),
    properties: z.unknown().optional(),
    occurred_at: z.string().datetime().optional(),
    idempotency_key: z.string().min(8).max(200),
    session_id: z.string().max(200).optional(),
    anonymous_id: z.string().max(200).optional(),
  })
  .superRefine((val, ctx) => {
    const r = validateEventProperties(val.name as WebEmittableEvent, val.properties ?? {})
    if (!r.success) {
      ctx.addIssue({
        code: 'custom',
        message: `Invalid properties for ${val.name}`,
        path: ['properties'],
      })
    }
  })

const BatchSchema = z.object({
  events: z.array(RawEventSchema).min(1).max(MAX_BATCH),
})

/** Coarse, non-PII geo from Vercel edge headers. Country/region only — no IP. */
function coarseGeo(req: NextRequest): Record<string, string> {
  const country = req.headers.get('x-vercel-ip-country')
  const region = req.headers.get('x-vercel-ip-country-region')
  const geo: Record<string, string> = {}
  if (country) geo.country = country
  if (region) geo.region = region
  return geo
}

export async function POST(req: NextRequest) {
  if (!getServiceSupabase()) {
    return Response.json({ error: 'Telemetry not configured.' }, { status: 503 })
  }

  const contentLength = Number(req.headers.get('content-length') ?? 0)
  if (contentLength > MAX_BODY_BYTES) {
    return Response.json({ error: 'Payload too large.' }, { status: 413 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON.' }, { status: 400 })
  }

  const parsed = BatchSchema.safeParse(body)
  if (!parsed.success) {
    // Reject the batch but never surface internals.
    return Response.json({ error: 'Invalid event batch.' }, { status: 400 })
  }

  // Resolve account identity server-side; never trust a user_id from the body.
  let userId: string | null = null
  const auth = await createSupabaseServerClient()
  if (auth) {
    const {
      data: { user },
    } = await auth.auth.getUser()
    userId = user?.id ?? null
  }

  const cookieAnon = req.cookies.get(ANONYMOUS_ID_COOKIE)?.value ?? null
  const geo = coarseGeo(req)
  const context = Object.keys(geo).length ? { geo } : {}

  const rows: TelemetryRow[] = parsed.data.events.map((e) => {
    // Re-parse to get the cleaned, typed properties for this event name.
    const props = validateEventProperties(e.name as WebEmittableEvent, e.properties ?? {})
    const event = {
      name: e.name,
      properties: props.success ? props.data : {},
    } as TelemetryEvent
    return buildRow(event, {
      source: 'web',
      userId,
      anonymousId: e.anonymous_id ?? cookieAnon,
      sessionId: e.session_id ?? null,
      occurredAt: e.occurred_at,
      idempotencyKey: e.idempotency_key,
      context,
    })
  })

  const inserted = await insertEvents(rows)

  // Stitch pre-auth browsing to the account: once we know both the anonymous id
  // and the signed-in user, record the mapping (last write wins). Best-effort.
  const anonId = cookieAnon ?? parsed.data.events.find((e) => e.anonymous_id)?.anonymous_id ?? null
  if (userId && anonId) {
    void stitchIdentity(anonId, userId)
  }

  return Response.json({ ok: true, accepted: parsed.data.events.length, inserted })
}

async function stitchIdentity(anonymousId: string, userId: string): Promise<void> {
  const supabase = getServiceSupabase()
  if (!supabase) return
  try {
    await supabase.from('telemetry_identity').upsert(
      { anonymous_id: anonymousId, user_id: userId, linked_at: new Date().toISOString() },
      { onConflict: 'anonymous_id' }
    )
  } catch (err) {
    console.error(
      '[telemetry] identity stitch failed:',
      err instanceof Error ? err.message : 'unknown error'
    )
  }
}
