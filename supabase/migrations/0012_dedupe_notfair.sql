-- ------------------------------------------------------------
-- De-duplicate NotFair (nowork-studio/NotFair).
--
-- The repo was curated as the "SEO & Paid Ads Toolkit" pack under
-- `notfair-*` slugs AND separately auto-ingested by the discovery
-- pipeline under `nowork-studio-notfair-*` slugs — the same upstream
-- skills carried twice. The discovery dedup keyed on the owner-repo
-- slug prefix and so missed the pack's custom prefix; that gap is now
-- closed in lib/ingest.ts (source-URL-aware `repoAlreadyKnown`).
--
-- This removes the 14 redundant pipeline rows, keeping the curated
-- pack versions. FKs to skills are ON DELETE CASCADE / SET NULL, so
-- pack_skills, collection_items, favorites, and reviews are cleaned
-- up automatically. Idempotent: a no-op if the rows are already gone.
-- ------------------------------------------------------------
delete from public.skills
where slug like 'nowork-studio-notfair-%';
