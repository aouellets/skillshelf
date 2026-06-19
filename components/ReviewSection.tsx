import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getServiceSupabase } from '@/lib/supabase'
import type { SkillReview } from '@/lib/types'
import { ReviewForm } from './ReviewForm'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="font-mono text-sm" aria-label={`${rating} out of 5 stars`}>
      <span className="text-accent">{'★'.repeat(rating)}</span>
      <span className="text-shelf-muted">{'★'.repeat(5 - rating)}</span>
    </span>
  )
}

/**
 * Written reviews for a skill plus a write/edit form for the signed-in user.
 * Server component: reads auth from cookies and reviews via the service role
 * (the table is service-role-only, but display is scoped to one skill_id).
 */
export async function ReviewSection({ skillId, slug }: { skillId: string; slug: string }) {
  const auth = await createSupabaseServerClient()
  const user = auth ? (await auth.auth.getUser()).data.user : null
  const userToken = user ? `auth:${user.id}` : null

  const service = getServiceSupabase()
  let reviews: SkillReview[] = []
  if (service) {
    const { data } = await service
      .from('skill_reviews')
      .select('*')
      .eq('skill_id', skillId)
      .order('updated_at', { ascending: false })
      .limit(100)
    reviews = (data ?? []) as SkillReview[]
  }

  const mine = userToken ? reviews.find((r) => r.user_token === userToken) ?? null : null
  const others = mine ? reviews.filter((r) => r.user_token !== mine.user_token) : reviews

  return (
    <section className="mt-10">
      <h2 className="text-sm font-medium text-shelf-text-primary">
        Reviews{reviews.length > 0 ? ` (${reviews.length})` : ''}
      </h2>

      <div className="mt-3">
        <ReviewForm
          skillId={skillId}
          signedIn={Boolean(user)}
          initialRating={mine?.rating ?? 0}
          initialBody={mine?.body ?? ''}
          loginHref={`/login?next=/skill/${slug}`}
        />
      </div>

      {reviews.length === 0 ? (
        <p className="mt-4 text-sm text-shelf-text-tertiary">
          No reviews yet. Be the first to review this skill.
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {mine && <ReviewItem review={mine} isMine />}
          {others.map((r) => (
            <ReviewItem key={r.id} review={r} />
          ))}
        </ul>
      )}
    </section>
  )
}

function ReviewItem({ review, isMine }: { review: SkillReview; isMine?: boolean }) {
  return (
    <li className="card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-shelf-text-primary">
            {review.author_name || 'Anonymous'}
          </span>
          {isMine && (
            <span className="rounded-btn border border-shelf-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-shelf-text-tertiary">
              You
            </span>
          )}
        </div>
        <Stars rating={review.rating} />
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-shelf-text-secondary">
        {review.body}
      </p>
      <p className="mt-2 font-mono text-xs text-shelf-text-tertiary">
        {formatDate(review.updated_at || review.created_at)}
      </p>
    </li>
  )
}
