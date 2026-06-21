import 'server-only'
import { getServiceSupabase } from '../supabase'
import type { TelemetryEvent } from './events'

/**
 * Server-side telemetry emitter. PRINCIPLE: telemetry never breaks the product
 * path. Every emit is fire-and-forget (`void track(...)`), time-bounded, and
 * swallows all errors — a telemetry outage produces zero user-visible failures.
 *
 * Identity is hybrid (see supabase/migrations/0007_telemetry.sql): MCP callers
 * are a text `user_token` (auth:<uuid> / mcp_<uuid> / legacy); we also derive a
 * `user_id` uuid from `auth:<uuid>` subjects so account-level metrics work.
 */

export type TelemetrySource = 'mcp' | 'web' | 'api'

export interface TrackOptions {
  source: TelemetrySource
  /** Verbatim MCP subject. Stored as user_token; account uuid derived from it. */
  userToken?: string | null
  /** Explicit account uuid (web, from auth.uid()). Wins over the derived one. */
  userId?: string | null
  /** Pre-auth web identity from the first-party cookie. */
  anonymousId?: string | null
  sessionId?: string | null
  /** Event time (handler/client clock). Defaults to now. */
  occurredAt?: string
  /** At-least-once key; duplicates are dropped at the DB. Defaults to random. */
  idempotencyKey?: string
  /** Coarse, non-PII context (app version, geo, UA family). Never a raw IP. */
  context?: Record<string, unknown>
}

/** Max time we let a single insert run before giving up. Bounds tail latency on
 *  serverless where a pending promise can otherwise outlive the response. */
const INSERT_TIMEOUT_MS = 1500

const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
const AUTH_TOKEN_RE = new RegExp(`^auth:(${UUID_RE.source.slice(1, -1)})$`)

/** The account uuid for an MCP subject, or null for anonymous/legacy tokens. */
export function deriveUserId(userToken?: string | null): string | null {
  if (!userToken) return null
  const m = AUTH_TOKEN_RE.exec(userToken)
  return m ? m[1] : null
}

/** Coarse, non-identifying app context attached to every server event. */
function appContext(): Record<string, unknown> {
  const version =
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ??
    process.env.npm_package_version ??
    'dev'
  return { app_version: version }
}

export interface TelemetryRow {
  event_name: string
  occurred_at: string
  user_id: string | null
  user_token: string | null
  anonymous_id: string | null
  session_id: string | null
  source: TelemetrySource
  properties: Record<string, unknown>
  context: Record<string, unknown>
  idempotency_key: string
}

/** Build a normalized row from an event + options (no I/O). */
export function buildRow(event: TelemetryEvent, opts: TrackOptions): TelemetryRow {
  return {
    event_name: event.name,
    occurred_at: opts.occurredAt ?? new Date().toISOString(),
    user_id: opts.userId ?? deriveUserId(opts.userToken),
    user_token: opts.userToken ?? null,
    anonymous_id: opts.anonymousId ?? null,
    session_id: opts.sessionId ?? null,
    source: opts.source,
    properties: event.properties as Record<string, unknown>,
    context: { ...appContext(), ...(opts.context ?? {}) },
    idempotency_key: opts.idempotencyKey ?? crypto.randomUUID(),
  }
}

/**
 * Bulk-insert pre-built rows, idempotently (duplicate idempotency_keys are
 * dropped via the unique constraint). Time-bounded; returns the inserted count
 * and never throws. Used by the web batch ingest route.
 */
export async function insertEvents(rows: TelemetryRow[]): Promise<number> {
  if (rows.length === 0) return 0
  const supabase = getServiceSupabase()
  if (!supabase) return 0

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), INSERT_TIMEOUT_MS)
  try {
    const { error, count } = await supabase
      .from('telemetry_events')
      .upsert(rows, {
        onConflict: 'idempotency_key',
        ignoreDuplicates: true,
        count: 'exact',
      })
      .abortSignal(controller.signal)
    if (error) {
      console.error('[telemetry] insert failed:', error.message)
      return 0
    }
    return count ?? 0
  } catch (err) {
    console.error(
      '[telemetry] insert threw:',
      err instanceof Error ? err.message : 'unknown error'
    )
    return 0
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Emit a single event. Fire-and-forget: call as `void track(...)`. Never throws,
 * never rejects in a way that can fail a caller — all errors are swallowed.
 */
export async function track(event: TelemetryEvent, opts: TrackOptions): Promise<void> {
  try {
    await insertEvents([buildRow(event, opts)])
  } catch {
    // Unreachable in practice (insertEvents swallows), but the contract is
    // "track never throws" — keep it true even if insertEvents changes.
  }
}
