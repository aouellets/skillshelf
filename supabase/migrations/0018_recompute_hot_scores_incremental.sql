-- Make recompute_hot_scores() cheap enough to stay under the statement timeout.
--
-- The original function UPDATEd every row in `skills` on every run (≈2.4k rows),
-- setting hot_score AND updated_at = now(). Because hot_score is indexed, no row
-- could be HOT-updated, so each run wrote a brand-new tuple for every skill —
-- and every new tuple had to be re-inserted into the skills HNSW vector index
-- and the FTS GIN index. That pushed the whole UPDATE to ~8.5s, tripping the
-- role statement timeout and returning a 500 from /api/cron/recompute.
--
-- Two changes:
--   1. Only update rows whose hot_score actually changed (IS DISTINCT FROM).
--      Skills with no installs in the last 14 days have a stable score, so they
--      are skipped — only the handful with live install velocity get rewritten
--      (~100 rows instead of ~2400). Measured: 8.5s -> ~0.15s.
--   2. Stop bumping updated_at. hot_score is a derived ranking field; touching
--      updated_at on every recompute falsely marked every skill as freshly
--      edited (and forced the row rewrite we are trying to avoid).

create or replace function public.recompute_hot_scores()
returns void
language sql
set search_path to 'public', 'pg_catalog'
as $function$
  update public.skills s
  set hot_score = v.new_score
  from (
    select sk.id,
           coalesce(
             sum(power(0.5, extract(epoch from (now() - ui.installed_at)) / (7 * 86400.0))),
             0
           ) * 1000 + ln(1 + sk.install_count) as new_score
    from public.skills sk
    left join public.user_installs ui
      on ui.skill_id = sk.id
     and ui.installed_at > now() - interval '14 days'
    group by sk.id, sk.install_count
  ) v
  where v.id = s.id
    and s.hot_score is distinct from v.new_score;
$function$;
