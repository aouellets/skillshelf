-- Relevance-ranked full-text search for skills and packs.
--
-- Why an RPC: PostgREST/supabase-js can ORDER BY columns but not by an
-- expression like ts_rank_cd(fts, query), so keyword results were ordered by
-- install_count (popularity) regardless of how well they matched. With
-- hide-until-real metrics most install_counts are 0, so that sort was near
-- random for the long tail. These functions rank by match quality instead.
--
-- The query string `q` is an OR-combined prefix tsquery (`a:* | b:*`) built by
-- lib/search.ts toTsQuery(raw, '|'): OR gives recall (one stray word can't zero
-- out the search), and ts_rank_cd gives precision ordering — rows matching more
-- terms, closer together, and in higher-weighted fields (name=A, tags/category=B,
-- description=C) rank first. install_count is only a tiebreak now.
--
-- Returning `setof <table-row>` as a composite column avoids enumerating every
-- column here; total_count is a window count over the full match set (computed
-- before LIMIT) so callers still get an accurate total for pagination.

create or replace function public.search_skills(
  q text,
  p_category text default null,
  p_featured boolean default null,
  p_limit int default 12,
  p_offset int default 0
)
returns table (skill public.skills, total_count bigint)
language sql
stable
as $$
  with matched as (
    select s as skill,
           ts_rank_cd(s.fts, to_tsquery('english', q)) as rank
    from public.skills s
    where s.fts @@ to_tsquery('english', q)
      and (p_category is null or s.category = p_category)
      and (p_featured is null or s.featured = p_featured)
  )
  select m.skill, count(*) over () as total_count
  from matched m
  order by m.rank desc, (m.skill).install_count desc
  limit greatest(p_limit, 1)
  offset greatest(p_offset, 0);
$$;

create or replace function public.search_packs(
  q text,
  p_category text default null,
  p_featured boolean default null,
  p_limit int default 12,
  p_offset int default 0
)
returns table (pack public.packs, skill_count bigint, total_count bigint)
language sql
stable
as $$
  with matched as (
    select p as pack,
           ts_rank_cd(p.fts, to_tsquery('english', q)) as rank,
           (select count(*) from public.pack_skills ps where ps.pack_id = p.id) as skill_count
    from public.packs p
    where p.fts @@ to_tsquery('english', q)
      and (p_category is null or p.category = p_category)
      and (p_featured is null or p.featured = p_featured)
  )
  select m.pack, m.skill_count, count(*) over () as total_count
  from matched m
  order by m.rank desc, (m.pack).install_count desc
  limit greatest(p_limit, 1)
  offset greatest(p_offset, 0);
$$;

-- Public catalog reads (same posture as match_skills/match_packs in 0009).
grant execute on function public.search_skills(text, text, boolean, int, int)
  to anon, authenticated, service_role;
grant execute on function public.search_packs(text, text, boolean, int, int)
  to anon, authenticated, service_role;
