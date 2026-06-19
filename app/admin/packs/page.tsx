import type { Metadata } from 'next'
import Link from 'next/link'
import { getAdminEmail } from '@/lib/admin'
import { getServiceSupabase } from '@/lib/supabase'
import { PackAdminReview } from '@/components/PackAdminReview'
import type { PackSubmission } from '@/lib/types'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Review pack submissions',
  robots: { index: false, follow: false },
}

async function loadPending(): Promise<PackSubmission[]> {
  const supabase = getServiceSupabase()
  if (!supabase) return []
  const { data, error } = await supabase
    .from('pack_submissions')
    .select('*')
    .in('status', ['pending', 'in_review', 'needs_changes'])
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) return []
  return (data ?? []) as PackSubmission[]
}

export default async function AdminPacksPage() {
  const admin = await getAdminEmail()

  if (!admin) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center sm:px-6">
        <h1 className="font-display text-3xl text-shelf-text-primary">Admin only</h1>
        <p className="mt-3 text-sm text-shelf-text-secondary">
          Sign in with an authorized admin account to review the pack queue.
        </p>
        <Link href="/" className="btn btn-secondary mt-6">
          Back home
        </Link>
      </div>
    )
  }

  const submissions = await loadPending()

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-widest text-shelf-text-tertiary">
        Admin · {admin}
      </p>
      <h1 className="mt-3 font-display text-4xl text-shelf-text-primary">Pack queue</h1>
      <p className="mt-3 text-sm text-shelf-text-secondary">
        {submissions.length} awaiting review. Approving publishes the pack and its
        skills to the live catalog as verified.{' '}
        <Link href="/admin/submissions" className="text-accent hover:text-accent-hover">
          Skill queue →
        </Link>
      </p>

      <PackAdminReview initial={submissions} />
    </div>
  )
}
