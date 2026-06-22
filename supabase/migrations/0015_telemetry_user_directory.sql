-- ============================================================================
-- 0015_telemetry_user_directory.sql
--
-- Per-user (per-actor) telemetry rollup for the admin "Users" directory. This
-- is a deliberate, admin-only extension of the otherwise aggregate-only
-- telemetry: it surfaces individual actors, their geography, and where/when
-- they signed up. It still stores NO PII — emails/usernames live only in
-- auth.users and are joined in at read time by the service role (see
-- lib/telemetry/admin-queries.ts). Geography is the same coarse, no-IP geo the
-- ingest paths already capture (country/region/city), now also threaded through
-- the MCP route and the signup event.
--
-- An "actor" is a person as best we can resolve them:
--   * account   — has a resolved auth.users id (web session, or an auth:<uuid>
--                 MCP token whose id the 0007 trigger derived). Pre-auth web
--                 events are folded in via telemetry_identity (anonymous_id ->
--                 user_id), so an account's pre-signup browsing counts too.
--   * mcp_anon  — anonymous MCP connector (mcp_<uuid> / legacy token, no account)
--   * web_anon  — pre-auth web visitor known only by their first-party cookie
--
-- Refreshed CONCURRENTLY by refresh_telemetry_rollups() (15-min Vercel cron),
-- exactly like the other rollups. Revoked from anon/authenticated; the only
-- reader is the isAdmin()-gated service-role client.
-- ============================================================================

create materialized view public.mv_user_directory as
with resolved as (
  -- Fold pre-auth web events into the account they later signed into.
  select
    e.event_name,
    e.occurred_at,
    e.source,
    e.session_id,
    e.user_token,
    e.anonymous_id,
    coalesce(e.user_id, ident.user_id)        as eff_user_id,
    e.context -> 'geo' ->> 'country'          as country,
    e.context -> 'geo' ->> 'region'           as region,
    e.context -> 'geo' ->> 'city'             as city,
    e.properties
  from public.telemetry_events e
  left join public.telemetry_identity ident
    on ident.anonymous_id = e.anonymous_id
),
keyed as (
  select
    *,
    coalesce(eff_user_id::text, user_token, 'anon:' || anonymous_id) as actor_key
  from resolved
  -- Drop the rare event that carries no identity at all.
  where coalesce(eff_user_id::text, user_token, anonymous_id) is not null
),
agg as (
  select
    actor_key,
    (array_agg(eff_user_id) filter (where eff_user_id is not null))[1] as user_id,
    min(occurred_at)                                                   as first_seen_at,
    max(occurred_at)                                                   as last_seen_at,
    count(*)                                                           as total_events,
    count(*) filter (where source = 'mcp')                            as mcp_events,
    count(*) filter (where source = 'web')                            as web_events,
    count(*) filter (where event_name = 'mcp_tool_invoked')           as tool_invocations,
    count(*) filter (where event_name in ('skill_installed', 'pack_installed')) as installs,
    count(*) filter (where event_name = 'skill_activated')            as activations,
    count(distinct session_id)                                        as sessions,
    (array_agg(user_token)   filter (where user_token is not null))[1]   as user_token,
    (array_agg(anonymous_id) filter (where anonymous_id is not null))[1] as anonymous_id
  from keyed
  group by actor_key
),
last_geo as (
  -- Most recent located event per actor = "where they're active from now".
  select distinct on (actor_key)
    actor_key,
    country as last_country,
    region  as last_region,
    city    as last_city,
    source  as last_source
  from keyed
  where country is not null
  order by actor_key, occurred_at desc
),
signup as (
  -- The user_signed_up event carries the signup method + the geo of the request
  -- that completed the auth exchange = "where they signed up from".
  select distinct on (actor_key)
    actor_key,
    occurred_at            as signup_at,
    properties ->> 'method' as signup_method,
    country                as signup_country,
    region                 as signup_region,
    city                   as signup_city
  from keyed
  where event_name = 'user_signed_up'
  order by actor_key, occurred_at asc
)
select
  a.actor_key,
  a.user_id,
  case
    when a.user_id is not null   then 'account'
    when a.user_token is not null then 'mcp_anon'
    else 'web_anon'
  end                       as actor_kind,
  a.user_token,
  a.anonymous_id,
  a.first_seen_at,
  a.last_seen_at,
  a.total_events,
  a.mcp_events,
  a.web_events,
  a.tool_invocations,
  a.installs,
  a.activations,
  a.sessions,
  g.last_country,
  g.last_region,
  g.last_city,
  g.last_source,
  s.signup_at,
  s.signup_method,
  s.signup_country,
  s.signup_region,
  s.signup_city
from agg a
left join last_geo g on g.actor_key = a.actor_key
left join signup   s on s.actor_key = a.actor_key;

-- Unique index is REQUIRED for REFRESH ... CONCURRENTLY.
create unique index mv_user_directory_actor_key_idx
  on public.mv_user_directory (actor_key);
create index mv_user_directory_last_seen_idx
  on public.mv_user_directory (last_seen_at desc);
create index mv_user_directory_user_id_idx
  on public.mv_user_directory (user_id);

-- Admin-only: identical posture to the other rollups. Service role bypasses.
revoke all on public.mv_user_directory from anon, authenticated;

-- ------------------------------------------------------------
-- Add the new view to the refresh entry point. Same contract as 0008/0013.
-- ------------------------------------------------------------
create or replace function public.refresh_telemetry_rollups()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  refresh materialized view concurrently public.mv_active_users_daily;
  refresh materialized view concurrently public.mv_activation;
  refresh materialized view concurrently public.mv_retention_weekly;
  refresh materialized view concurrently public.mv_install_funnel;
  refresh materialized view concurrently public.mv_skill_performance;
  refresh materialized view concurrently public.mv_pack_performance;
  refresh materialized view concurrently public.mv_growth_accounting;
  refresh materialized view concurrently public.mv_tool_performance;
  refresh materialized view concurrently public.mv_event_volume_daily;
  refresh materialized view concurrently public.mv_trending_skills;
  refresh materialized view concurrently public.mv_trending_packs;
  refresh materialized view concurrently public.mv_search_terms;
  refresh materialized view concurrently public.mv_user_directory;
end;
$$;

revoke execute on function public.refresh_telemetry_rollups() from public;
revoke execute on function public.refresh_telemetry_rollups() from anon, authenticated;
grant  execute on function public.refresh_telemetry_rollups() to service_role;
