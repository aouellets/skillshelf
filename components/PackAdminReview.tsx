'use client'

import { useMemo, useState } from 'react'
import type { PackSubmission } from '@/lib/types'

const STATUS_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'in_review', label: 'In review' },
  { key: 'needs_changes', label: 'Needs changes' },
]

type Action = 'approve' | 'reject' | 'needs_changes'

/** POST one decision to the admin endpoint. Throws on a non-ok response. Backs
 *  both the single-card buttons and the bulk fan-out, so the publish + email
 *  logic is shared. */
async function postAction(id: string, action: Action, note?: string, featured?: boolean) {
  const res = await fetch('/api/admin/pack-submissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, action, note: note || undefined, featured: featured ?? false }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? 'Action failed')
  return data
}

export function PackAdminReview({ initial }: { initial: PackSubmission[] }) {
  const [items, setItems] = useState<PackSubmission[]>(initial)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkNote, setBulkNote] = useState('')
  const [bulkBusy, setBulkBusy] = useState<Action | null>(null)
  const [bulkMsg, setBulkMsg] = useState<string | null>(null)

  function removeItem(id: string) {
    setItems((prev) => prev.filter((s) => s.id !== id))
    setSelected((prev) => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const visible = useMemo(() => {
    let out = items
    if (status !== 'all') out = out.filter((s) => s.status === status)
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      out = out.filter((s) =>
        [s.name, s.tagline, s.description, s.category, s.author, s.submitter_email]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      )
    }
    return [...out].sort((a, b) => {
      const cmp = a.created_at.localeCompare(b.created_at)
      return sort === 'oldest' ? cmp : -cmp
    })
  }, [items, query, status, sort])

  const visibleIds = visible.map((s) => s.id)
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id))
  const selectedCount = items.filter((s) => selected.has(s.id)).length

  function toggleSelectAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id))
      else visibleIds.forEach((id) => next.add(id))
      return next
    })
  }

  async function runBulk(action: Action) {
    const targets = items.filter((s) => selected.has(s.id))
    if (targets.length === 0 || bulkBusy) return

    setBulkBusy(action)
    setBulkMsg(null)
    const ids = targets.map((s) => s.id)
    const results = await Promise.allSettled(ids.map((id) => postAction(id, action, bulkNote)))
    const okIds = ids.filter((_, i) => results[i].status === 'fulfilled')
    const failed = results.length - okIds.length

    setItems((prev) => prev.filter((s) => !okIds.includes(s.id)))
    setSelected((prev) => {
      const next = new Set(prev)
      okIds.forEach((id) => next.delete(id))
      return next
    })
    setBulkBusy(null)
    if (okIds.length > 0) setBulkNote('')
    setBulkMsg(
      failed > 0
        ? `${okIds.length} done · ${failed} failed — try again or act on them individually.`
        : `${okIds.length} pack${okIds.length === 1 ? '' : 's'} updated.`
    )
  }

  if (items.length === 0) {
    return (
      <div className="card mt-8 p-10 text-center">
        <p className="text-shelf-text-primary">No pack submissions to review.</p>
      </div>
    )
  }

  return (
    <div className="mt-8">
      {/* Sticky toolbar: filters stay reachable while scrolling a long queue.
          top-16 clears the global header; the bleed margins span the page gutter. */}
      <div className="sticky top-16 z-20 -mx-4 border-b border-shelf-border bg-shelf-void/85 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by name, author, email…"
            className="input w-full max-w-xs text-sm"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="input py-1.5 text-sm"
            aria-label="Status"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as 'newest' | 'oldest')}
            className="input py-1.5 text-sm"
            aria-label="Sort"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
          {visible.length > 0 && (
            <label className="flex cursor-pointer items-center gap-2 text-xs text-shelf-text-secondary">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleSelectAllVisible}
                aria-label="Select all visible pack submissions"
              />
              Select all
            </label>
          )}
          <span className="ml-auto font-mono text-xs text-shelf-text-tertiary">
            {visible.length} of {items.length}
          </span>
        </div>

        {/* Bulk action bar — appears only with a selection. Each action fans out
            over the existing single-item endpoint (Promise.allSettled), so partial
            failures are reported rather than silently swallowed. */}
        {selectedCount > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-shelf-border/60 pt-3">
            <span className="font-mono text-xs text-accent">{selectedCount} selected</span>
            <input
              value={bulkNote}
              onChange={(e) => setBulkNote(e.target.value)}
              placeholder="Shared reviewer note (optional)"
              className="input w-full max-w-xs py-1.5 text-sm"
              aria-label="Shared reviewer note for bulk action"
            />
            <div className="ml-auto flex flex-wrap gap-2">
              <button
                onClick={() => setSelected(new Set())}
                disabled={!!bulkBusy}
                className="btn btn-ghost"
              >
                Clear
              </button>
              <button
                onClick={() => runBulk('reject')}
                disabled={!!bulkBusy}
                className="btn btn-ghost"
              >
                {bulkBusy === 'reject' ? 'Working…' : 'Reject'}
              </button>
              <button
                onClick={() => runBulk('needs_changes')}
                disabled={!!bulkBusy}
                className="btn btn-secondary"
              >
                {bulkBusy === 'needs_changes' ? 'Working…' : 'Request changes'}
              </button>
              <button
                onClick={() => runBulk('approve')}
                disabled={!!bulkBusy}
                className="btn btn-primary"
              >
                {bulkBusy === 'approve' ? 'Working…' : 'Approve & publish'}
              </button>
            </div>
          </div>
        )}

        {bulkMsg && (
          <p role="status" className="mt-2 text-xs text-shelf-text-tertiary">
            {bulkMsg}
          </p>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="card mt-5 p-10 text-center">
          <p className="text-shelf-text-secondary">No pack submissions match these filters.</p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {visible.map((sub) => (
            <ReviewCard
              key={sub.id}
              sub={sub}
              selected={selected.has(sub.id)}
              onToggleSelect={() => toggle(sub.id)}
              onDone={() => removeItem(sub.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ReviewCard({
  sub,
  selected,
  onToggleSelect,
  onDone,
}: {
  sub: PackSubmission
  selected: boolean
  onToggleSelect: () => void
  onDone: () => void
}) {
  const [note, setNote] = useState('')
  const [feature, setFeature] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function act(action: Action) {
    setBusy(true)
    setError(null)
    try {
      await postAction(sub.id, action, note, feature)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
      setBusy(false)
    }
  }

  return (
    <div className={`card p-5 ${selected ? 'border-accent/60' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            aria-label={`Select ${sub.name}`}
            className="mt-1.5 shrink-0"
          />
          <div className="min-w-0">
            <h3 className="text-base font-medium text-shelf-text-primary">{sub.name}</h3>
            <p className="mt-0.5 text-sm text-shelf-text-secondary">{sub.tagline}</p>
            <p className="mt-2 text-sm text-shelf-text-secondary">{sub.description}</p>
            <p className="mt-2 font-mono text-xs text-shelf-text-tertiary">
              {sub.category}
              {sub.author ? ` · ${sub.author}` : ''}
              {sub.submitter_email ? ` · ${sub.submitter_email}` : ''}
            </p>
            {sub.repo_url && (
              <a
                href={sub.repo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block break-all font-mono text-xs text-accent hover:text-accent-hover"
              >
                {sub.repo_url}
              </a>
            )}
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-shelf-border px-2.5 py-1 font-mono text-xs text-shelf-text-tertiary">
          {sub.skill_slugs.length} skills
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {sub.skill_slugs.map((slug) => (
          <a
            key={slug}
            href={`/skill/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-btn border border-shelf-border bg-shelf-elevated px-2 py-0.5 font-mono text-xs text-shelf-text-secondary hover:text-accent"
          >
            {slug}
          </a>
        ))}
      </div>

      <div className="mt-4 space-y-3 border-t border-shelf-border/60 pt-4">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Reviewer note (sent with reject / request changes)"
          className="input w-full text-sm"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-shelf-text-secondary">
            <input type="checkbox" checked={feature} onChange={(e) => setFeature(e.target.checked)} />
            Feature this pack on approve
          </label>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => act('reject')} disabled={busy} className="btn btn-ghost">
              Reject
            </button>
            <button onClick={() => act('needs_changes')} disabled={busy} className="btn btn-secondary">
              Request changes
            </button>
            <button onClick={() => act('approve')} disabled={busy} className="btn btn-primary">
              {busy ? 'Working…' : feature ? 'Approve + feature' : 'Approve & publish'}
            </button>
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
