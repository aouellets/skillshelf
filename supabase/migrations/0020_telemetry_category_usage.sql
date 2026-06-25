-- ============================================================================
-- 0020_telemetry_category_usage.sql
--
-- "Which TYPES of skills see the most use" — a daily rollup of skill-bearing
-- events bucketed by the skill's category. Grain is day × category × event ×
-- source (mirrors mv_event_volume_daily, 0013) so the admin UI can re-slice by
-- category / event / range / source entirely client-side, no per-request DB
-- work — the same "load tiny rollups once, filter in browser" contract as the
-- activity timeline.
--
-- Category resolves via public.skills.category through the same uuid-regex CASE
-- guard used by mv_skill_performance (0008) so a non-uuid skill_id never errors
-- the cast. Events whose skill_id has no matching skills row fall to category
-- 'unknown' (coalesce) so totals never silently drop. NOTE: category is
-- point-in-time-of-refresh — re-categorizing a skill re-buckets its historical
-- events on the next refresh, exactly like mv_skill_performance resolves names.
-- ============================================================================

drop materialized view if exists public.mv_category_usage_daily cascade;
create materialized view public.mv_category_usage_daily as
select
  date_trunc('day', tae.occurred_at)::date as day,
  coalesce(sk.category, 'unknown')         as category,
  tae.event_name,
  tae.source,
  count(*)                                 as events,
  count(distinct tae.actor_key)            as actors
from public.telemetry_account_events tae
left join public.skills sk
  on sk.id = (case
                when tae.properties->>'skill_id' ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
                then (tae.properties->>'skill_id')::uuid
              end)
where tae.event_name in ('skill_installed', 'skill_activated', 'skill_viewed')
  and tae.properties->>'skill_id' is not null
group by 1, 2, 3, 4
with data;

-- Unique index is REQUIRED for REFRESH ... CONCURRENTLY.
create unique index if not exists mv_category_usage_daily_pk
  on public.mv_category_usage_daily (day, category, event_name, source);

-- Admin-only: identical posture to the other rollups. Service role bypasses.
revoke all on public.mv_category_usage_daily from anon, authenticated;

-- ------------------------------------------------------------
-- Append the new view to the refresh entry point. Full set re-declared (13 from
-- 0015 + mv_category_usage_daily) so this migration is correct on its own.
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
  refresh materialized view concurrently public.mv_category_usage_daily;
end;
$$;

revoke execute on function public.refresh_telemetry_rollups() from public;
revoke execute on function public.refresh_telemetry_rollups() from anon, authenticated;
grant  execute on function public.refresh_telemetry_rollups() to service_role;
