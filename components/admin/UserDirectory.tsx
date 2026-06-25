'use client'

import { useMemo } from 'react'
import type { UserDirectoryRow } from '@/lib/telemetry/admin-queries'
import { SortableTable, type Column } from './interactive'
import { fmtNum, fmtDate, fmtRelative } from './format'

/** ISO-3166 alpha-2 → regional-indicator flag emoji. '' when not a 2-letter code. */
function flag(cc: string | null | undefined): string {
  if (!cc || cc.length !== 2 || !/^[a-zA-Z]{2}$/.test(cc)) return ''
  const base = 0x1f1e6
  return String.fromCodePoint(
    ...[...cc.toUpperCase()].map((c) => base + c.charCodeAt(0) - 65)
  )
}

/** "San Francisco, CA · US" from the coarse geo parts. '—' when nothing known. */
function placeLabel(city: string | null, region: string | null, country: string | null): string {
  const parts = [city, region].filter(Boolean)
  const head = parts.join(', ')
  if (head && country) return `${head} · ${country}`
  return head || country || '—'
}

/** A hover tooltip with the captured lat/lng, or undefined when not located. */
function coordTitle(lat: number | null, lng: number | null): string | undefined {
  return lat != null && lng != null ? `~${lat}, ${lng}` : undefined
}

const KIND_LABEL: Record<UserDirectoryRow['actor_kind'], string> = {
  account: 'Account',
  mcp_anon: 'MCP connector',
  web_anon: 'Web visitor',
}

const KIND_STYLE: Record<UserDirectoryRow['actor_kind'], string> = {
  account: 'bg-accent/15 text-accent',
  mcp_anon: 'bg-shelf-text-tertiary/15 text-shelf-text-secondary',
  web_anon: 'bg-shelf-text-tertiary/10 text-shelf-text-tertiary',
}

function shortId(value: string | null): string {
  if (!value) return '—'
  // Strip a leading "anon:"/"mcp_"/"auth:" marker then show a short, stable head.
  const bare = value.replace(/^(anon:|mcp_|auth:)/, '')
  return bare.length > 14 ? `${bare.slice(0, 8)}…${bare.slice(-4)}` : bare
}

/** The human label for an actor: email/name for accounts, a short token otherwise. */
function identity(row: UserDirectoryRow): { primary: string; secondary: string | null } {
  if (row.email) return { primary: row.email, secondary: row.name }
  if (row.name) return { primary: row.name, secondary: row.user_id ? shortId(row.user_id) : null }
  if (row.actor_kind === 'account') return { primary: shortId(row.user_id), secondary: 'account' }
  return { primary: shortId(row.user_token ?? row.anonymous_id), secondary: null }
}

export function UserDirectory({
  rows,
  adminEmail,
}: {
  rows: UserDirectoryRow[]
  adminEmail: string
}) {
  const stats = useMemo(() => {
    const accounts = rows.filter((r) => r.actor_kind === 'account').length
    const located = rows.filter((r) => r.last_country).length
    const countries = new Set(rows.map((r) => r.last_country).filter(Boolean)).size
    return { total: rows.length, accounts, located, countries }
  }, [rows])

  const columns: Column<UserDirectoryRow>[] = [
    {
      key: 'identity',
      label: 'User',
      render: (r) => {
        const id = identity(r)
        return (
          <div className="flex flex-col">
            <span className="font-mono text-xs text-shelf-text-primary">{id.primary}</span>
            <span className="mt-0.5 flex items-center gap-1.5">
              <span
                className={`rounded px-1.5 py-px text-[0.6rem] uppercase tracking-wide ${KIND_STYLE[r.actor_kind]}`}
              >
                {KIND_LABEL[r.actor_kind]}
              </span>
              {id.secondary && (
                <span className="text-[0.7rem] text-shelf-text-tertiary">{id.secondary}</span>
              )}
            </span>
          </div>
        )
      },
      sortValue: (r) => identity(r).primary.toLowerCase(),
    },
    {
      key: 'location',
      label: 'Active from',
      render: (r) => (
        <span className="text-shelf-text-secondary" title={coordTitle(r.last_lat, r.last_lng)}>
          {flag(r.last_country) && <span className="mr-1">{flag(r.last_country)}</span>}
          {placeLabel(r.last_city, r.last_region, r.last_country)}
        </span>
      ),
      sortValue: (r) => `${r.last_country ?? '~'}${r.last_region ?? ''}${r.last_city ?? ''}`,
    },
    {
      key: 'signup',
      label: 'Signed up from',
      render: (r) =>
        r.signup_at ? (
          <span className="text-shelf-text-secondary" title={coordTitle(r.signup_lat, r.signup_lng)}>
            {flag(r.signup_country) && <span className="mr-1">{flag(r.signup_country)}</span>}
            {placeLabel(r.signup_city, r.signup_region, r.signup_country)}
            <span className="ml-1 text-[0.7rem] text-shelf-text-tertiary">
              {fmtDate(r.signup_at)}
            </span>
          </span>
        ) : (
          <span className="text-shelf-text-tertiary">—</span>
        ),
      sortValue: (r) => r.signup_at ?? '',
    },
    {
      key: 'first_seen',
      label: 'First seen',
      align: 'right',
      render: (r) => <span className="text-shelf-text-secondary">{fmtDate(r.first_seen_at)}</span>,
      sortValue: (r) => r.first_seen_at,
      defaultDesc: true,
    },
    {
      key: 'last_seen',
      label: 'Last seen',
      align: 'right',
      render: (r) => <span className="text-shelf-text-secondary">{fmtRelative(r.last_seen_at)}</span>,
      sortValue: (r) => r.last_seen_at,
      defaultDesc: true,
    },
    {
      key: 'events',
      label: 'Events',
      align: 'right',
      render: (r) => <span className="font-mono text-shelf-text-primary">{fmtNum(r.total_events)}</span>,
      sortValue: (r) => r.total_events,
      defaultDesc: true,
    },
    {
      key: 'tools',
      label: 'Tools',
      align: 'right',
      render: (r) => <span className="font-mono text-shelf-text-secondary">{fmtNum(r.tool_invocations)}</span>,
      sortValue: (r) => r.tool_invocations,
      defaultDesc: true,
    },
    {
      key: 'installs',
      label: 'Installs',
      align: 'right',
      render: (r) => <span className="font-mono text-shelf-text-secondary">{fmtNum(r.installs)}</span>,
      sortValue: (r) => r.installs,
      defaultDesc: true,
    },
    {
      key: 'activations',
      label: 'Active uses',
      align: 'right',
      render: (r) => <span className="font-mono text-shelf-text-secondary">{fmtNum(r.activations)}</span>,
      sortValue: (r) => r.activations,
      defaultDesc: true,
    },
  ]

  return (
    <div className="mx-auto max-w-content px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="font-display text-2xl text-shelf-text-primary">Users</h1>
        <p className="mt-1 text-sm text-shelf-text-secondary">
          Every resolved actor — accounts and anonymous connectors — with coarse geography and
          signup origin. Emails are read live from auth.users for {adminEmail}; nothing here is
          stored as PII in telemetry.
        </p>
        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <Stat label="Actors" value={fmtNum(stats.total)} />
          <Stat label="Accounts" value={fmtNum(stats.accounts)} />
          <Stat label="Located" value={fmtNum(stats.located)} />
          <Stat label="Countries" value={fmtNum(stats.countries)} />
        </dl>
      </header>

      <div className="card p-2 sm:p-3">
        <SortableTable
          rows={rows}
          columns={columns}
          getKey={(r) => r.actor_key}
          searchAccessor={(r) =>
            [
              r.email,
              r.name,
              r.user_token,
              r.anonymous_id,
              r.last_country,
              r.last_region,
              r.last_city,
              r.signup_country,
              r.actor_kind,
            ]
              .filter(Boolean)
              .join(' ')
          }
          searchPlaceholder="Filter by email, name, token, country…"
          initialSortKey="last_seen"
          emptyMessage="No telemetry actors yet."
        />
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="font-mono text-xs uppercase tracking-widest text-shelf-text-tertiary">{label}</dt>
      <dd className="font-mono text-shelf-text-primary">{value}</dd>
    </div>
  )
}
