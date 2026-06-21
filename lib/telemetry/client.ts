'use client'

import {
  ANONYMOUS_ID_COOKIE,
  type TelemetryEvent,
  type WebEmittableEvent,
} from './events'

/**
 * Batched, best-effort client telemetry for web browsing. ADDITIVE to the
 * server-side MCP pipeline — it carries only the web-emittable events (see
 * WEB_EMITTABLE_EVENTS) and never blocks rendering.
 *
 * Events buffer in memory and flush: on a short interval, when the buffer fills,
 * and on visibilitychange→hidden / pagehide via navigator.sendBeacon (the
 * reliable "page is going away" path). Identity is a first-party anonymous_id
 * cookie; the server upgrades it to an account when the user is signed in.
 */

const ENDPOINT = '/api/telemetry'
const FLUSH_INTERVAL_MS = 5000
const MAX_BUFFER = 25

/** Properties for a given web-emittable event name (compile-time exhaustive). */
type PropsFor<K extends WebEmittableEvent> = Extract<TelemetryEvent, { name: K }>['properties']

interface QueuedEvent {
  name: WebEmittableEvent
  properties: Record<string, unknown>
  occurred_at: string
  idempotency_key: string
  session_id: string
  anonymous_id: string
}

let buffer: QueuedEvent[] = []
let flushTimer: ReturnType<typeof setInterval> | null = null
let listenersBound = false

/** A stable id for this page load, grouping a burst of events into a session. */
let sessionId: string | null = null
function getSessionId(): string {
  if (!sessionId) sessionId = uuid()
  return sessionId
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  // Fallback for older browsers; uniqueness is sufficient for an idempotency key.
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** Read or lazily create the persistent first-party anonymous id. */
function getAnonymousId(): string {
  if (typeof document === 'undefined') return 'ssr'
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${ANONYMOUS_ID_COOKIE}=([^;]+)`)
  )
  if (match) return decodeURIComponent(match[1])
  const id = uuid()
  const oneYear = 60 * 60 * 24 * 365
  document.cookie = `${ANONYMOUS_ID_COOKIE}=${encodeURIComponent(id)}; path=/; max-age=${oneYear}; SameSite=Lax`
  return id
}

function ensureBackgroundFlush(): void {
  if (typeof window === 'undefined' || listenersBound) return
  listenersBound = true

  flushTimer = setInterval(() => flush(false), FLUSH_INTERVAL_MS)

  // The page is going away — use sendBeacon, which survives unload.
  const onHide = () => flush(true)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') onHide()
  })
  window.addEventListener('pagehide', onHide)
}

/**
 * Queue a web telemetry event. Typed exhaustively: `properties` must match the
 * schema for `name` in lib/telemetry/events.ts. No-ops during SSR.
 */
export function track<K extends WebEmittableEvent>(name: K, properties: PropsFor<K>): void {
  if (typeof window === 'undefined') return
  buffer.push({
    name,
    properties: properties as Record<string, unknown>,
    occurred_at: new Date().toISOString(),
    idempotency_key: uuid(),
    session_id: getSessionId(),
    anonymous_id: getAnonymousId(),
  })
  ensureBackgroundFlush()
  if (buffer.length >= MAX_BUFFER) flush(false)
}

/**
 * Send buffered events. `beacon` uses navigator.sendBeacon for the unload path;
 * otherwise a keepalive fetch. Errors are swallowed — telemetry never throws.
 */
export function flush(beacon: boolean): void {
  if (buffer.length === 0) return
  const events = buffer
  buffer = []
  const payload = JSON.stringify({ events })

  try {
    if (beacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' })
      const ok = navigator.sendBeacon(ENDPOINT, blob)
      if (!ok) buffer = events.concat(buffer) // requeue if the beacon was refused
      return
    }
    void fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {
      // Drop on failure — best-effort web analytics, never user-visible.
    })
  } catch {
    // Swallow: telemetry must never break the page.
  }
}

/** Optional teardown (e.g. for tests). */
export function _resetForTest(): void {
  buffer = []
  if (flushTimer) clearInterval(flushTimer)
  flushTimer = null
  listenersBound = false
  sessionId = null
}
