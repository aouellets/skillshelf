import type { Metadata } from 'next'
import Link from 'next/link'
import { getAdminEmail } from '@/lib/admin'
import { getUserDirectory } from '@/lib/telemetry/admin-queries'
import { UserDirectory } from '@/components/admin/UserDirectory'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Users',
  robots: { index: false, follow: false },
}

/**
 * Admin-only per-user telemetry directory. Same gate as /admin/telemetry: the
 * server-side getAdminEmail() returns null for anon/non-admin and we bail BEFORE
 * any read — so a non-admin never triggers the auth.users lookup. Defense in
 * depth: mv_user_directory is also revoked from anon/authenticated (migration
 * 0015), so even a direct query returns nothing.
 */
export default async function AdminUsersPage() {
  const admin = await getAdminEmail()

  if (!admin) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center sm:px-6">
        <h1 className="font-display text-3xl text-shelf-text-primary">Admin only</h1>
        <p className="mt-3 text-sm text-shelf-text-secondary">
          Sign in with an authorized admin account to view the user directory. Set{' '}
          <code className="font-mono text-accent">ADMIN_EMAILS</code> in the environment to grant
          access.
        </p>
        <Link href="/" className="btn btn-secondary mt-6">
          Back home
        </Link>
      </div>
    )
  }

  const rows = await getUserDirectory()
  return <UserDirectory rows={rows} adminEmail={admin} />
}
