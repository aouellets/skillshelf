-- ------------------------------------------------------------
-- 0011 — Demo media assets.
--
-- One row per rendered demo video (platform / pack / skill). Source videos live
-- in the `skillme-demos` Remotion project and are rendered + published by its
-- pipeline (render → poster → upload to the `demos` storage bucket → upsert here).
--
-- Packs and skills get a single landscape row each; the platform gets both a
-- landscape and a portrait row. `render_hash` lets the publish pipeline skip
-- re-uploading unchanged videos. No engagement metrics live here — this is
-- purely the media pointer the website reads to show a subject's Demo section.
-- ------------------------------------------------------------
create table if not exists public.media_assets (
  id            uuid primary key default gen_random_uuid(),
  subject_type  text not null check (subject_type in ('platform', 'pack', 'skill')),
  subject_slug  text not null,
  orientation   text not null check (orientation in ('landscape', 'portrait')),
  kind          text not null default 'demo' check (kind in ('demo')),
  url           text not null,
  poster_url    text,
  width         integer not null,
  height        integer not null,
  duration_ms   integer not null,
  bytes         bigint,
  render_hash   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- One asset per (subject, orientation): the publish pipeline upserts on this.
  unique (subject_type, subject_slug, orientation)
);

-- Fast lookup for a subject's videos, and for a pack's member-skill gallery
-- (which queries `subject_slug in (...)`).
create index if not exists media_assets_subject_idx
  on public.media_assets (subject_type, subject_slug);
create index if not exists media_assets_slug_idx
  on public.media_assets (subject_slug);

-- Public catalog read, same posture as skills/packs. Writes happen only through
-- the service-role key in the publish pipeline (service role bypasses RLS), so
-- no insert/update policy is defined => anon/authenticated cannot write.
alter table public.media_assets enable row level security;

drop policy if exists "media assets are public" on public.media_assets;
create policy "media assets are public"
  on public.media_assets for select
  using (true);
