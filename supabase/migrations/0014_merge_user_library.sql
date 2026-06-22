-- ============================================================
-- Migration 0014 — merge_user_library(): one correct, conflict-safe re-key of a
-- user's entire owned library from one identity token to another.
--
-- WHY: identity is fragmented in practice. A person can hold several tokens —
-- an anonymous connector subject (`mcp_<uuid>`) and one or more account
-- subjects (`auth:<uuid>`) created via different login emails/providers
-- (GitHub vs email). Their installs/favorites/collections/reviews scatter across
-- those tokens, and `/library` only shows one. The prior `mergeAnonLibrary`
-- (lib/mcp/mergeAnonLibrary.ts) only moved `user_installs` and only mcp_→auth:.
-- This function moves EVERY user-owned table and works for any from→to
-- (anon→account AND account→account), so it backs both the automatic OAuth
-- reclaim and any account-merge tool.
--
-- The target row always wins: rows whose unique key already exists under p_to
-- are left in place and the source duplicate is dropped (so a re-run is a no-op).
-- SECURITY DEFINER + service_role-only: callers are trusted server code that has
-- already authorized the merge (never exposed to anon/authenticated via RPC).
-- Idempotent. Returns per-table moved counts as jsonb.
-- ============================================================
create or replace function public.merge_user_library(p_from text, p_to text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb := '{}'::jsonb;
  n int;
begin
  if p_from is null or p_to is null or length(p_from) = 0 or length(p_to) = 0 or p_from = p_to then
    return jsonb_build_object('error', 'invalid arguments');
  end if;

  -- user_installs — unique (user_token, skill_id)
  with moved as (
    update public.user_installs s set user_token = p_to
    where s.user_token = p_from
      and not exists (
        select 1 from public.user_installs d
        where d.user_token = p_to and d.skill_id = s.skill_id)
    returning 1)
  select count(*) into n from moved;
  delete from public.user_installs where user_token = p_from;
  result := result || jsonb_build_object('user_installs', n);

  -- user_pack_installs — unique (user_token, pack_id)
  with moved as (
    update public.user_pack_installs s set user_token = p_to
    where s.user_token = p_from
      and not exists (
        select 1 from public.user_pack_installs d
        where d.user_token = p_to and d.pack_id = s.pack_id)
    returning 1)
  select count(*) into n from moved;
  delete from public.user_pack_installs where user_token = p_from;
  result := result || jsonb_build_object('user_pack_installs', n);

  -- user_favorites — unique (user_token, skill_id)
  with moved as (
    update public.user_favorites s set user_token = p_to
    where s.user_token = p_from
      and not exists (
        select 1 from public.user_favorites d
        where d.user_token = p_to and d.skill_id = s.skill_id)
    returning 1)
  select count(*) into n from moved;
  delete from public.user_favorites where user_token = p_from;
  result := result || jsonb_build_object('user_favorites', n);

  -- skill_reviews — unique (user_token, skill_id)
  with moved as (
    update public.skill_reviews s set user_token = p_to
    where s.user_token = p_from
      and not exists (
        select 1 from public.skill_reviews d
        where d.user_token = p_to and d.skill_id = s.skill_id)
    returning 1)
  select count(*) into n from moved;
  delete from public.skill_reviews where user_token = p_from;
  result := result || jsonb_build_object('skill_reviews', n);

  -- user_collections — unique (user_token, slug). share_token is globally unique
  -- but unaffected by re-keying user_token. Same-slug collision → keep target's.
  with moved as (
    update public.user_collections s set user_token = p_to
    where s.user_token = p_from
      and not exists (
        select 1 from public.user_collections d
        where d.user_token = p_to and d.slug = s.slug)
    returning 1)
  select count(*) into n from moved;
  -- collection_skills rows follow their collection via collection_id (no
  -- user_token column), so they move automatically. Drop any collided source
  -- collections (their collection_skills cascade per FK).
  delete from public.user_collections where user_token = p_from;
  result := result || jsonb_build_object('user_collections', n);

  return result;
end $$;

revoke all on function public.merge_user_library(text, text) from public;
revoke execute on function public.merge_user_library(text, text) from anon, authenticated;
grant  execute on function public.merge_user_library(text, text) to service_role;
