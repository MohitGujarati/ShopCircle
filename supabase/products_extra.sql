-- =============================================================================
-- ShopCircle — extra columns for public.products
--
-- WHY A SEPARATE FILE:
--   posts_products.sql creates the table with "create table IF NOT EXISTS".
--   That means once the table exists, editing that file does NOTHING — adding a
--   column there would be silently ignored on a re-run. Changing an existing
--   table needs ALTER, and that's what this file is. This is the normal shape of
--   a "migration": the first file builds it, later files change it.
--
-- WHAT IT ADDS:
--   The Add product form (src/components/create/ProductAdd.tsx) collects three
--   details the original table has no room for. Without these columns an insert
--   that sends them fails outright with PostgREST error PGRST204
--   ("Could not find the 'category' column of 'products' in the schema cache") —
--   it does NOT silently drop the extra fields.
--
-- HOW TO RUN IT:
--   Supabase.com -> SQL Editor -> New query -> paste -> Run.
--   Safe to re-run: "add column if not exists" skips columns already there.
-- =============================================================================

alter table public.products
  -- Fashion / Tech / Home / Beauty / Other. Plain text, not an enum: an enum
  -- needs a migration every time you add a category, and this list will change.
  add column if not exists category  text,

  -- "New" or "Used".
  add column if not exists condition text,

  -- Free-text "City, State" for now. A real marketplace would store structured
  -- coordinates so it could sort by distance — out of scope here.
  add column if not exists location  text;


-- All three are NULLABLE on purpose. The 1 product row that might already exist
-- can't be given a category retroactively, and a "not null" column added to a
-- non-empty table needs a default or the ALTER fails. Nullable = the old rows
-- stay valid, and the app treats null as "not specified".

-- No new RLS policies needed: policies apply to the ROW, not to individual
-- columns, so the four policies already on public.products
-- (posts_products.sql §products) cover these columns automatically.
