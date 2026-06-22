import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getServiceSupabase } from '@/lib/supabase'
import { ConnectedLogins } from '@/components/account/ConnectedLogins'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Account',
  robots: { index: false, follow: false },
}

export default async function AccountPage() {
  const auth = await createSupabaseServerClient()

  if (!auth) {
    return (
      <Shell>
        <div className="card p-10 text-center">
          <p className="text-shelf-text-primary">Sign-in isn’t configured</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-shelf-text-secondary">
            Authentication isn’t set up on this deployment yet.
          </p>
        </div>
      </Shell>
    )
  }

  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) redirect('/login?next=/account')

  // Unified-library snapshot — confirms what this one account owns.
  const service = getServiceSupabase()
  let installed = 0
  if (service) {
    const { count } = await service
      .from('user_installs')
      .select('*', { count: 'exact', head: true })
      .eq('user_token', `auth:${user.id}`)
      .eq('active', true)
    installed = count ?? 0
  }

  return (
    <Shell>
      <div className="card mb-5 flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-widest text-shelf-text-tertiary">
            Signed in as
          </p>
          <p className="mt-1 truncate text-lg text-shelf-text-primary">{user.email}</p>
        </div>
        <Link href="/library" className="btn btn-secondary shrink-0">
          {installed} skill{installed === 1 ? '' : 's'} in your library →
        </Link>
      </div>

      <Suspense fallback={<div className="card p-6 text-sm text-shelf-text-tertiary">Loading…</div>}>
        <ConnectedLogins />
      </Suspense>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl font-semibold tracking-tight text-shelf-text-primary">
        Account
      </h1>
      <p className="mt-3 max-w-xl text-shelf-text-secondary">
        Manage how you sign in. Linking multiple logins keeps one library across the website
        and the Claude connector.
      </p>
      <div className="mt-8">{children}</div>
    </div>
  )
}
