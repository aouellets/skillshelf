import { NextRequest, NextResponse } from 'next/server'
import type { EmailOtpType, SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { track } from '@/lib/telemetry/track'
import { geoContext } from '@/lib/telemetry/geo'

export const dynamic = 'force-dynamic'

/** Only allow same-origin, in-app redirect targets (prevents open redirects). */
function safeNext(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/'
  return next
}

/**
 * Emit `user_signed_up` once per account. The idempotency_key is keyed to the
 * user id, so it persists exactly once no matter how many times the callback
 * runs (no fragile "is this their first sign-in" heuristic). Awaited because the
 * route redirects immediately — but it is bounded and never throws.
 */
async function trackSignup(supabase: SupabaseClient, req: NextRequest): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return
  const method = (user.app_metadata?.provider as string | undefined) ?? 'email'
  // Stamp the signup with coarse geo so the admin directory can show "where they
  // signed up from" — the request that completes the auth exchange originates
  // from the new user, so its edge geo is theirs.
  await track(
    { name: 'user_signed_up', properties: { method } },
    {
      source: 'web',
      userId: user.id,
      idempotencyKey: `signup:${user.id}`,
      context: geoContext(req.headers),
    }
  )
}

/**
 * Auth redirect target. Handles both:
 *  - OAuth + PKCE magic links (`?code=...`) via exchangeCodeForSession
 *  - OTP-style email links (`?token_hash=...&type=...`) via verifyOtp
 * On failure, bounces back to /login with an error code instead of a dead end.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const next = safeNext(searchParams.get('next'))
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  // The provider can bounce back with an error (e.g. linkIdentity hitting a
  // GitHub identity already tied to another account). Surface it on the page the
  // user came from (account linking) instead of dead-ending at /login.
  const oauthError = searchParams.get('error_description') ?? searchParams.get('error')
  if (oauthError) {
    const dest = next !== '/' ? next : '/login'
    return NextResponse.redirect(`${origin}${dest}?autherror=${encodeURIComponent(oauthError)}`)
  }

  const supabase = await createSupabaseServerClient()
  if (!supabase) {
    return NextResponse.redirect(`${origin}/login?error=callback`)
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      await trackSignup(supabase, request)
      return NextResponse.redirect(`${origin}${next}`)
    }
    return NextResponse.redirect(`${origin}/login?error=exchange`)
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (!error) {
      await trackSignup(supabase, request)
      return NextResponse.redirect(`${origin}${next}`)
    }
    return NextResponse.redirect(`${origin}/login?error=exchange`)
  }

  return NextResponse.redirect(`${origin}/login?error=callback`)
}
