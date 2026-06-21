-- ============================================================
-- Migration 0008 — Telemetry rollups (metrics layer).
--
-- Materialized views over public.telemetry_events answering the adoption
-- questions: DAU/WAU/MAU, activation, weekly retention cohorts, the
-- browse→install→active-use funnel, per-skill/pack performance, and growth
-- accounting (new/retained/resurrected/churned).
--
-- Idempotent. Apply after 0007_telemetry.sql.
--
-- ACCESS: the MVs and helper views are REVOKED from anon + authenticated, so
-- PostgREST never exposes them to the public/anon keys. Admin reads go through
-- the service-role client in an admin-guarded server route (see lib/admin.ts),
-- exactly as the rest of the app reads privileged data.
--
-- REFRESH: public.refresh_telemetry_rollups() refreshes all MVs CONCURRENTLY
-- (each has a unique index, and all are created WITH DATA so the first
-- concurrent refresh is valid). Driven by a Vercel Cron route
-- (app/api/cron/telemetry, CRON_SECRET-guarded) calling the RPC. Cadence is set
-- in vercel.json. ALTERNATIVE: schedule the same RPC with pg_cron
--   select cron.schedule('telemetry-rollups','*/15 * * * *',
--                         $$select public.refresh_telemetry_rollups()$$);
-- if you prefer in-database scheduling over a Vercel Cron.
-- ============================================================

-- ------------------------------------------------------------
-- Account-id helper: collapse the hybrid identity to a single account uuid.
-- Prefers user_id; else derives it from an `auth:<uuid>` MCP subject (reusing
-- telemetry_user_id_from_token from 0007 — single source of the parsing rule).
-- Anonymous (`mcp_<uuid>`) and legacy tokens yield NULL — they have no account.
-- With the 0007 BEFORE INSERT trigger, user_id is already populated for
-- auth-token rows; this coalesce stays as a robust fallback (and covers any rows
-- predating the trigger).
-- ------------------------------------------------------------
create or replace function public.telemetry_account_id(p_user_id uuid, p_user_token text)
returns uuid
language sql
immutable
as $$
  select coalesce(p_user_id, public.telemetry_user_id_from_token(p_user_token));
$$;

-- ------------------------------------------------------------
-- Base view: every event with a derived account_id and a unified actor_key.
-- actor_key counts distinct *actors* including anonymous ones (account, else
-- anonymous_id, else raw token, else session). Not materialized — it is the
-- shared FROM for the MVs and is recomputed at each refresh.
--
-- security_invoker = true so this view honours the caller's RLS on
-- telemetry_events rather than running as owner; combined with the REVOKE below
-- it cannot leak the raw stream to anon/authenticated.
-- ------------------------------------------------------------
create or replace view public.telemetry_account_events
with (security_invoker = true) as
select
  e.*,
  public.telemetry_account_id(e.user_id, e.user_token) as account_id,
  coalesce(
    public.telemetry_account_id(e.user_id, e.user_token)::text,
    e.anonymous_id,
    e.user_token,
    e.session_id
  ) as actor_key
from public.telemetry_events e;

revoke all on public.telemetry_account_events from anon, authenticated;

-- Per-account activation facts, reused by mv_activation. Not materialized.
create or replace view public.telemetry_account_activation
with (security_invoker = true) as
with signups as (
  select account_id, min(occurred_at) as signup_at
  from public.telemetry_account_events
  where event_name = 'user_signed_up' and account_id is not null
  group by account_id
),
first_install as (
  select account_id, min(occurred_at) as first_install_at
  from public.telemetry_account_events
  where event_name = 'skill_installed' and account_id is not null
  group by account_id
)
select
  s.account_id,
  s.signup_at,
  fi.first_install_at,
  (fi.first_install_at is not null) as activated,
  case when fi.first_install_at is not null
       then extract(epoch from (fi.first_install_at - s.signup_at)) / 3600.0
  end as hours_to_activate
from signups s
left join first_install fi on fi.account_id = s.account_id;

revoke all on public.telemetry_account_activation from anon, authenticated;

-- ============================================================
-- 1. mv_active_users_daily — DAU/WAU/MAU by source.
-- WAU = distinct actors active in the trailing 7 days; MAU = trailing 28 days.
-- ============================================================
drop materialized view if exists public.mv_active_users_daily cascade;
create materialized view public.mv_active_users_daily as
with daily_actor as (
  select
    date_trunc('day', occurred_at)::date as day,
    source,
    actor_key
  from public.telemetry_account_events
  where actor_key is not null
  group by 1, 2, 3
),
days as (select distinct day, source from daily_actor)
select
  d.day,
  d.source,
  count(distinct case when da.day = d.day then da.actor_key end)                          as dau,
  count(distinct case when da.day between d.day - 6  and d.day then da.actor_key end)      as wau,
  count(distinct case when da.day between d.day - 27 and d.day then da.actor_key end)      as mau
from days d
join daily_actor da
  on da.source = d.source
 and da.day between d.day - 27 and d.day
group by d.day, d.source
with data;

create unique index if not exists mv_active_users_daily_pk
  on public.mv_active_users_daily (day, source);

-- ============================================================
-- 2. mv_activation — signup → first install, by signup week.
-- ============================================================
drop materialized view if exists public.mv_activation cascade;
create materialized view public.mv_activation as
select
  date_trunc('week', signup_at)::date as signup_week,
  count(*)                                                                  as cohort_size,
  count(*) filter (where activated)                                         as activated_users,
  round(
    count(*) filter (where activated)::numeric / nullif(count(*), 0), 4
  )                                                                         as activation_rate,
  round(avg(hours_to_activate) filter (where activated)::numeric, 2)        as avg_hours_to_activate
from public.telemetry_account_activation
group by 1
with data;

create unique index if not exists mv_activation_pk
  on public.mv_activation (signup_week);

-- ============================================================
-- 3. mv_retention_weekly — weekly retention by signup-week cohort.
-- week_offset 0 = signup week. retention_rate = retained / cohort_size.
-- ============================================================
drop materialized view if exists public.mv_retention_weekly cascade;
create materialized view public.mv_retention_weekly as
with signups as (
  select account_id, min(occurred_at) as signup_at
  from public.telemetry_account_events
  where event_name = 'user_signed_up' and account_id is not null
  group by account_id
),
cohorts as (
  select account_id, date_trunc('week', signup_at)::date as signup_week
  from signups
),
cohort_size as (
  select signup_week, count(*) as cohort_size
  from cohorts group by signup_week
),
activity as (
  select distinct account_id, date_trunc('week', occurred_at)::date as active_week
  from public.telemetry_account_events
  where account_id is not null
)
select
  c.signup_week,
  ((a.active_week - c.signup_week) / 7)            as week_offset,
  cs.cohort_size,
  count(distinct c.account_id)                      as retained_users,
  round(count(distinct c.account_id)::numeric / nullif(cs.cohort_size, 0), 4) as retention_rate
from cohorts c
join activity a
  on a.account_id = c.account_id
 and a.active_week >= c.signup_week
join cohort_size cs on cs.signup_week = c.signup_week
group by c.signup_week, week_offset, cs.cohort_size
with data;

create unique index if not exists mv_retention_weekly_pk
  on public.mv_retention_weekly (signup_week, week_offset);

-- ============================================================
-- 4. mv_install_funnel — browse → view → install → activate.
-- pct_of_top is relative to the first step; step_conversion is vs the prior step.
-- Distinct actors per step (a step funnel, not a strictly-ordered per-user path).
-- ============================================================
drop materialized view if exists public.mv_install_funnel cascade;
create materialized view public.mv_install_funnel as
with steps as (
  select 1 as step_order, 'browsed'   as step,
         count(distinct actor_key) as actors
    from public.telemetry_account_events where event_name = 'skill_browsed'
  union all
  select 2, 'viewed',    count(distinct actor_key)
    from public.telemetry_account_events where event_name = 'skill_viewed'
  union all
  select 3, 'installed', count(distinct actor_key)
    from public.telemetry_account_events where event_name = 'skill_installed'
  union all
  select 4, 'activated', count(distinct actor_key)
    from public.telemetry_account_events where event_name = 'skill_activated'
)
select
  step_order,
  step,
  actors,
  round(actors::numeric / nullif(first_value(actors) over (order by step_order), 0), 4) as pct_of_top,
  round(actors::numeric / nullif(lag(actors)       over (order by step_order), 0), 4) as step_conversion
from steps
with data;

create unique index if not exists mv_install_funnel_pk
  on public.mv_install_funnel (step_order);

-- ============================================================
-- 5. mv_skill_performance — per skill: installs, uninstalls, distinct
-- activating users, avg rating, install→activation rate.
-- ============================================================
drop materialized view if exists public.mv_skill_performance cascade;
create materialized view public.mv_skill_performance as
with ev as (
  select event_name, actor_key, properties->>'skill_id' as skill_id,
         (properties->>'rating') as rating
  from public.telemetry_account_events
  where properties->>'skill_id' is not null
),
ids as (select distinct skill_id from ev),
inst as (
  select skill_id, count(*) as installs, count(distinct actor_key) as distinct_installers
  from ev where event_name = 'skill_installed' group by skill_id
),
uninst as (
  select skill_id, count(*) as uninstalls
  from ev where event_name = 'skill_uninstalled' group by skill_id
),
act as (
  select skill_id, count(distinct actor_key) as activating_users
  from ev where event_name = 'skill_activated' group by skill_id
),
rat as (
  select skill_id, round(avg(rating::numeric), 2) as avg_rating, count(*) as ratings
  from ev where event_name = 'skill_rated' and rating ~ '^[1-5]$' group by skill_id
)
select
  ids.skill_id,
  sk.name as skill_name,
  coalesce(inst.installs, 0)            as installs,
  coalesce(uninst.uninstalls, 0)        as uninstalls,
  coalesce(act.activating_users, 0)     as activating_users,
  rat.avg_rating,
  coalesce(rat.ratings, 0)              as ratings,
  round(coalesce(act.activating_users, 0)::numeric / nullif(inst.distinct_installers, 0), 4)
                                        as install_to_activation_rate
from ids
left join inst   on inst.skill_id   = ids.skill_id
left join uninst on uninst.skill_id = ids.skill_id
left join act    on act.skill_id    = ids.skill_id
left join rat    on rat.skill_id    = ids.skill_id
left join public.skills sk
  on sk.id = (case
                when ids.skill_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
                then ids.skill_id::uuid
              end)
with data;

create unique index if not exists mv_skill_performance_pk
  on public.mv_skill_performance (skill_id);

-- ============================================================
-- 6. mv_pack_performance — per pack: installs and derived skill activations
-- (activations of any skill belonging to the pack, via public.pack_skills).
-- ============================================================
drop materialized view if exists public.mv_pack_performance cascade;
create materialized view public.mv_pack_performance as
with pi as (
  select properties->>'pack_id' as pack_id,
         count(*) as installs,
         count(distinct actor_key) as distinct_installers
  from public.telemetry_account_events
  where event_name = 'pack_installed' and properties->>'pack_id' is not null
  group by 1
),
pack_acts as (
  select ps.pack_id::text as pack_id,
         count(*) as derived_skill_activations,
         count(distinct tae.actor_key) as distinct_activating_users
  from public.pack_skills ps
  join public.telemetry_account_events tae
    on tae.event_name = 'skill_activated'
   and tae.properties->>'skill_id' = ps.skill_id::text
  group by ps.pack_id
),
ids as (select pack_id from pi union select pack_id from pack_acts)
select
  ids.pack_id,
  pk.name as pack_name,
  coalesce(pi.installs, 0)                       as installs,
  coalesce(pi.distinct_installers, 0)            as distinct_installers,
  coalesce(pa.derived_skill_activations, 0)      as derived_skill_activations,
  coalesce(pa.distinct_activating_users, 0)      as distinct_activating_users
from ids
left join pi on pi.pack_id = ids.pack_id
left join pack_acts pa on pa.pack_id = ids.pack_id
left join public.packs pk
  on pk.id = (case
                when ids.pack_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
                then ids.pack_id::uuid
              end)
with data;

create unique index if not exists mv_pack_performance_pk
  on public.mv_pack_performance (pack_id);

-- ============================================================
-- 7. mv_growth_accounting — monthly new/retained/resurrected/churned accounts.
-- new: first active month. retained: active last month too. resurrected: active
-- before but not last month. churned: counted in the month after an account's
-- last active month.
-- ============================================================
drop materialized view if exists public.mv_growth_accounting cascade;
create materialized view public.mv_growth_accounting as
with monthly as (
  select distinct account_id, date_trunc('month', occurred_at)::date as period
  from public.telemetry_account_events
  where account_id is not null
),
seq as (
  select
    account_id,
    period,
    lag(period) over (partition by account_id order by period) as prev_period,
    lead(period) over (partition by account_id order by period) as next_period,
    min(period) over (partition by account_id)                  as first_period
  from monthly
),
classified as (
  select
    period,
    account_id,
    case
      when period = first_period                                   then 'new'
      when prev_period = (period - interval '1 month')::date       then 'retained'
      else 'resurrected'
    end as state
  from seq
),
churn as (
  select (period + interval '1 month')::date as period, account_id
  from seq
  where next_period is null
     or next_period > (period + interval '1 month')::date
),
agg_active as (
  select
    period,
    count(*) filter (where state = 'new')          as new_users,
    count(*) filter (where state = 'retained')     as retained_users,
    count(*) filter (where state = 'resurrected')  as resurrected_users
  from classified group by period
),
agg_churn as (
  select period, count(*) as churned_users from churn group by period
)
select
  coalesce(a.period, c.period)        as period,
  coalesce(a.new_users, 0)            as new_users,
  coalesce(a.retained_users, 0)      as retained_users,
  coalesce(a.resurrected_users, 0)   as resurrected_users,
  coalesce(c.churned_users, 0)       as churned_users
from agg_active a
full outer join agg_churn c on a.period = c.period
with data;

create unique index if not exists mv_growth_accounting_pk
  on public.mv_growth_accounting (period);

-- ------------------------------------------------------------
-- Lock down all rollups: deny anon/authenticated; admin reads via service role.
-- ------------------------------------------------------------
revoke all on public.mv_active_users_daily from anon, authenticated;
revoke all on public.mv_activation          from anon, authenticated;
revoke all on public.mv_retention_weekly     from anon, authenticated;
revoke all on public.mv_install_funnel       from anon, authenticated;
revoke all on public.mv_skill_performance    from anon, authenticated;
revoke all on public.mv_pack_performance     from anon, authenticated;
revoke all on public.mv_growth_accounting    from anon, authenticated;

-- ------------------------------------------------------------
-- Refresh entry point. SECURITY DEFINER so the service role (via the cron RPC)
-- can refresh views owned by the migration role. CONCURRENTLY keeps reads
-- non-blocking; valid because every MV has a unique index and was created WITH
-- DATA. Revoked from PUBLIC; granted to service_role for the cron route.
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
end;
$$;

revoke execute on function public.refresh_telemetry_rollups() from public;
grant  execute on function public.refresh_telemetry_rollups() to service_role;
