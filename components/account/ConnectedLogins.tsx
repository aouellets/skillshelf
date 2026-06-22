'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type { UserIdentity } from '@supabase/supabase-js'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

/**
 * Connected logins manager. Lets a signed-in user attach additional sign-in
 * methods to their ONE account so different logins (GitHub, email) resolve to a
 * single library instead of fragmenting into separate accounts. Linking uses
 * supabase.auth.linkIdentity(), which round-trips through /auth/callback exactly
 * like a normal OAuth sign-in. Requires "Allow manual linking" in Supabase Auth;
 * if it's off, linkIdentity errors and we surface that verbatim.
 */

const PROVIDER_LABEL: Record<string, string> = {
  github: 'GitHub',
  email: 'Email (magic link)',
  google: 'Google',
}

function providerLabel(p: string) {
  return PROVIDER_LABEL[p] ?? p.charAt(0).toUpperCase() + p.slice(1)
}

export function ConnectedLogins() {
  const supabase = getSupabaseBrowserClient()
  const params = useSearchParams()
  const [identities, setIdentities] = useState<UserIdentity[] | null>(null)
  const [error, setError] = useState<string | null>(
    params.get('autherror') ? decodeURIComponent(params.get('autherror')!) : null
  )
  const [busy, setBusy] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!supabase) return
    const { data, error } = await supabase.auth.getUserIdentities()
    if (error) {
      setError(error.message)
      setIdentities([])
      return
    }
    setIdentities(data?.identities ?? [])
  }, [supabase])

  useEffect(() => {
    refresh()
  }, [refresh])

  if (!supabase) {
    return (
      <p className="text-sm text-shelf-text-secondary">
        Sign-in isn’t configured on this deployment.
      </p>
    )
  }

  const linkedProviders = new Set((identities ?? []).map((i) => i.provider))

  async function linkGitHub() {
    if (!supabase) return
    setError(null)
    setBusy('link:github')
    const { error } = await supabase.auth.linkIdentity({
      provider: 'github',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/account` },
    })
    // On success the browser is already redirecting to GitHub; only errors land here.
    if (error) {
      setBusy(null)
      setError(
        /manual linking/i.test(error.message)
          ? 'Account linking is currently disabled. An admin must enable "Allow manual linking" in Supabase Auth settings.'
          : error.message
      )
    }
  }

  async function unlink(identity: UserIdentity) {
    if (!supabase) return
    if ((identities?.length ?? 0) <= 1) {
      setError('You can’t remove your only sign-in method.')
      return
    }
    setError(null)
    setBusy(`unlink:${identity.identity_id}`)
    const { error } = await supabase.auth.unlinkIdentity(identity)
    setBusy(null)
    if (error) {
      setError(error.message)
      return
    }
    await refresh()
  }

  return (
    <div className="card p-5 sm:p-6">
      <h2 className="font-display text-xl text-shelf-text-primary">Connected logins</h2>
      <p className="mt-1 text-sm text-shelf-text-secondary">
        Link more than one way to sign in so every login lands in the same library. Your
        installed skills, favorites, and collections all live under one account.
      </p>

      {error && (
        <p role="alert" className="mt-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <ul className="mt-5 divide-y divide-shelf-border/60">
        {identities === null ? (
          <li className="py-3 text-sm text-shelf-text-tertiary">Loading…</li>
        ) : identities.length === 0 ? (
          <li className="py-3 text-sm text-shelf-text-tertiary">No connected logins found.</li>
        ) : (
          identities.map((id) => (
            <li key={id.identity_id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-sm text-shelf-text-primary">{providerLabel(id.provider)}</p>
                <p className="truncate font-mono text-xs text-shelf-text-tertiary">
                  {(id.identity_data?.email as string | undefined) ?? id.provider}
                </p>
              </div>
              {identities.length > 1 && (
                <button
                  type="button"
                  onClick={() => unlink(id)}
                  disabled={busy === `unlink:${id.identity_id}`}
                  className="btn btn-ghost shrink-0 text-sm"
                >
                  {busy === `unlink:${id.identity_id}` ? 'Removing…' : 'Unlink'}
                </button>
              )}
            </li>
          ))
        )}
      </ul>

      {!linkedProviders.has('github') && (
        <button
          type="button"
          onClick={linkGitHub}
          disabled={busy === 'link:github'}
          className="btn btn-secondary mt-5"
        >
          {busy === 'link:github' ? 'Redirecting…' : 'Link GitHub'}
        </button>
      )}

      <p className="mt-4 text-xs text-shelf-text-tertiary">
        Already installed skills under a different email? Those live in a separate library —
        contact us to merge them into this account.
      </p>
    </div>
  )
}
