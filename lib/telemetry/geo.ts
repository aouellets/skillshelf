/**
 * Coarse, non-PII geo from Vercel edge headers — the single source of truth for
 * "where is this request from" across the web ingest, the auth/signup callback,
 * and the MCP route. We capture country / region / city only. NO raw IP, no
 * precise coordinates: city-level is the floor of resolution we keep.
 *
 * Vercel URL-encodes the city header (e.g. `San%20Francisco`), so we decode it.
 * Returns a plain object suitable for the telemetry `context.geo` slot; callers
 * wrap it as `{ geo }` only when at least one field is present.
 */
export interface CoarseGeo {
  country?: string
  region?: string
  city?: string
}

function decode(value: string | null): string | undefined {
  if (!value) return undefined
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/** Extract coarse geo from a request's headers. Empty object when none present. */
export function coarseGeo(headers: Headers): CoarseGeo {
  const geo: CoarseGeo = {}
  const country = headers.get('x-vercel-ip-country')
  const region = headers.get('x-vercel-ip-country-region')
  const city = decode(headers.get('x-vercel-ip-city'))
  if (country) geo.country = country
  if (region) geo.region = region
  if (city) geo.city = city
  return geo
}

/** `{ geo }` context wrapper, or `{}` when no geo could be resolved. */
export function geoContext(headers: Headers): Record<string, unknown> {
  const geo = coarseGeo(headers)
  return Object.keys(geo).length ? { geo } : {}
}
