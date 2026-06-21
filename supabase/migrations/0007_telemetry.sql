-- ============================================================
-- Migration 0007 — First-party telemetry: append-only event log + identity
-- stitching. Powers adoption analytics (DAU/WAU/MAU, activation, retention,
-- the browse→install→active-use funnel, per-skill/pack performance, growth
-- accounting). Rollups live in 0008_telemetry_rollups.sql.
--
-- Idempotent. Safe to run multiple times. Apply via the Supabase SQL editor or
-- `supabase db push`.
--
-- SECURITY MODEL (consistent with 0002_rls_hardening.sql): RLS is ON. The
-- service-role key (used by the ingest paths) bypasses RLS. The ONLY policy is
-- a self-read for authenticated users (`user_id = auth.uid()`); there is no
-- anon read and no client insert path. Admin reads go through the rollup
-- views/RPCs in 0008, never this raw table.
--
-- IDENTITY (see lib/mcp/oauth.ts, lib/mcp/types.ts): the MCP server — our
-- highest-signal surface — identifies callers by a TEXT subject, not an
-- auth.users uuid:
--   * `auth:<uuid>`  — a signed-in account; the uuid IS the auth.users id
--   * `mcp_<uuid>`   — an anonymous connector identity
--   * a raw legacy header token
-- The web surface identifies callers by Supabase Auth (auth.uid()).
-- We therefore store BOTH:
--   * user_token — the verbatim MCP subject; the join key to public.user_installs
--   * user_id    — the auth.users id, derived from `auth:<uuid>` subjects (MCP)
--                  or set directly from auth.uid() (web)
-- This keeps account-level cohorts (activation, retention, growth) working for
-- MCP events, which a user_id-only schema would strand as anonymous.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- TELEMETRY_EVENTS — append-only event log. One row per emitted event.
-- ------------------------------------------------------------
create table if not exists public.telemetry_events (
  id              uuid primary key default gen_random_uuid(),
  event_name      text not null,
  -- Client/handler clock (when the event happened) vs server clock (when we
  -- durably received it). Skew/replay is visible as the gap between them.
  occurred_at     timestamptz not null,
  received_at     timestamptz not null default now(),
  -- Account identity. Nullable: anonymous MCP subjects and pre-auth web
  -- sessions have no account. ON DELETE CASCADE hard-deletes an account's
  -- user_id-attributed events; token-attributed rows are purged via
  -- purge_telemetry_for_user() (below), since the FK can't see them.
  user_id         uuid references auth.users (id) on delete cascade,
  -- Verbatim MCP subject (auth:<uuid> / mcp_<uuid> / legacy token). Join key to
  -- public.user_installs.user_token. Null for web/api events.
  user_token      text,
  -- Pre-auth web identity, persisted in a first-party cookie. Stitched to an
  -- account via public.telemetry_identity at login.
  anonymous_id    text,
  session_id      text,
  source          text not null check (source in ('mcp', 'web', 'api')),
  -- Typed per-event payload (see lib/telemetry/events.ts). ZERO PII.
  properties      jsonb not null default '{}',
  -- App version, coarse geo (country/region), UA family. NEVER a raw IP.
  context         jsonb not null default '{}',
  -- At-least-once delivery: every event carries a stable key; the unique
  -- constraint drops duplicate inserts (idempotent replay).
  idempotency_key text not null,
  unique (idempotency_key)
);

-- Query-shaped indexes. The rollups (0008) scan by event_name over time, by
-- account over time, and by source; the GIN index supports property filters
-- (e.g. properties->>'skill_id').
create index if not exists telemetry_events_name_time_idx
  on public.telemetry_events (event_name, occurred_at desc);
create index if not exists telemetry_events_user_time_idx
  on public.telemetry_events (user_id, occurred_at desc);
create index if not exists telemetry_events_token_time_idx
  on public.telemetry_events (user_token, occurred_at desc);
create index if not exists telemetry_events_source_time_idx
  on public.telemetry_events (source, occurred_at desc);
create index if not exists telemetry_events_props_gin_idx
  on public.telemetry_events using gin (properties);

-- PARTITIONING (deliberately NOT implemented yet): at current volume (low
-- thousands of events) a single table with the indexes above is the right call
-- — range partitioning on occurred_at adds partition-maintenance machinery for
-- no present benefit. When monthly volume warrants it, convert to:
--   create table telemetry_events (...) partition by range (occurred_at);
-- with monthly child partitions (telemetry_events_yYYYYmMM) created ahead of
-- time by a scheduled job, and the indexes above declared per-partition. The
-- unique(idempotency_key) constraint must then include occurred_at or move to a
-- per-partition unique index. No application code changes are required.

-- ------------------------------------------------------------
-- IDENTITY DERIVATION. The MCP `user_token` is the PRIMARY identity (every MCP
-- event carries it). When it is the `auth:<uuid>` form, the uuid IS the real
-- auth.users id — extract it. Anonymous (`mcp_<uuid>`) and legacy tokens return
-- NULL (no account). This parsing rule lives in ONE place: the rollups'
-- telemetry_account_id() (0008) reuses this function.
-- ------------------------------------------------------------
create or replace function public.telemetry_user_id_from_token(p_user_token text)
returns uuid
language sql
immutable
as $$
  select case
    when p_user_token ~ '^auth:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      then substring(p_user_token from 6)::uuid
  end;
$$;

-- Populate user_id from the user_token at INSERT time. The highest-signal MCP
-- events arrive with a text subject, not an auth.uid(); this fills their account
-- uuid into the FK column so activation / retention / growth-accounting work for
-- signed-in accounts, and so the auth.users ON DELETE CASCADE reaches them. Only
-- a NULL user_id is filled (an explicit web user_id from auth.uid() always
-- wins); anonymous and legacy tokens leave it NULL. The schema therefore owns
-- this guarantee for ANY insert path, not just the application emitter.
create or replace function public.telemetry_events_set_user_id()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.user_id is null and new.user_token is not null then
    new.user_id := public.telemetry_user_id_from_token(new.user_token);
  end if;
  return new;
end;
$$;

drop trigger if exists telemetry_events_set_user_id_trg on public.telemetry_events;
create trigger telemetry_events_set_user_id_trg
  before insert on public.telemetry_events
  for each row execute function public.telemetry_events_set_user_id();

alter table public.telemetry_events enable row level security;

-- Self-read only: an authenticated user may read events attributed to their own
-- account. Inserts have NO policy, so anon/authenticated are denied and only the
-- service-role ingest paths can write. No anon read of any kind.
drop policy if exists "telemetry self read" on public.telemetry_events;
create policy "telemetry self read"
  on public.telemetry_events
  for select
  to authenticated
  using (user_id = auth.uid());

-- ------------------------------------------------------------
-- TELEMETRY_IDENTITY — maps a pre-auth web anonymous_id to an account, so a
-- visitor's pre-signup browsing can be stitched to their account at login.
-- One anonymous_id resolves to at most one account (last write wins).
-- ------------------------------------------------------------
create table if not exists public.telemetry_identity (
  anonymous_id text primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  first_seen_at timestamptz not null default now(),
  linked_at     timestamptz not null default now()
);

create index if not exists telemetry_identity_user_idx
  on public.telemetry_identity (user_id);

alter table public.telemetry_identity enable row level security;
-- No policies: service-role only (stitching happens server-side at login).

-- ------------------------------------------------------------
-- PURGE — hard-delete every event attributable to an account, for account
-- deletion / GDPR erasure. The FK cascade covers user_id rows; this also
-- catches MCP rows attributed only by the `auth:<uuid>` token, plus the
-- identity mapping. SECURITY DEFINER so the service role can run it; revoked
-- from PUBLIC so it is never callable via the anon REST API.
-- ------------------------------------------------------------
create or replace function public.purge_telemetry_for_user(p_user_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.telemetry_events
   where user_id = p_user_id
      or user_token = 'auth:' || p_user_id::text;
  delete from public.telemetry_identity
   where user_id = p_user_id;
$$;

revoke execute on function public.purge_telemetry_for_user(uuid) from public;
