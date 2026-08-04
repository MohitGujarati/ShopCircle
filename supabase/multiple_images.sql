-- =============================================================================
-- ShopCircle — multiple images per post / product
--
-- WHY AN ARRAY COLUMN, not a `post_images` table:
--   A separate table is the "correct" relational answer, and it's what you'd
--   want if each image needed its own metadata (alt text, ordering, per-image
--   likes). Here an image is just a URL in a fixed order, so a text[] keeps it
--   to ONE column, no join, and no second query per card. Postgres arrays are
--   first-class — supabase-js sends and receives them as plain JS arrays.
--
-- WHY image_url STAYS:
--   Old rows have it, the profile grid and the delete flow read it, and it's a
--   convenient "cover image". The app now writes BOTH: images[] gets every
--   photo, image_url gets the first one. Nothing that already worked breaks.
--
-- HOW TO RUN IT:
--   Supabase.com -> SQL Editor -> New query -> paste -> Run. Safe to re-run.
-- =============================================================================

alter table public.posts
  add column if not exists images text[] not null default '{}';

alter table public.products
  add column if not exists images text[] not null default '{}';


-- BACKFILL: every existing row has one photo in image_url and an empty array.
-- Copy it across so the app can read `images` everywhere without a fallback.
-- array[...] builds a one-element array; the where clause keeps this re-runnable
-- (rows already backfilled are skipped).
update public.posts
set images = array[image_url]
where image_url is not null and cardinality(images) = 0;

update public.products
set images = array[image_url]
where image_url is not null and cardinality(images) = 0;


-- Note on `not null default '{}'`: unlike the nullable columns in
-- products_extra.sql, this one is safe to declare NOT NULL on a non-empty table
-- BECAUSE it has a default — Postgres fills existing rows with the empty array.
-- A NOT NULL column with no default would fail here.
--
-- No RLS changes: policies apply to the row, not the column.
