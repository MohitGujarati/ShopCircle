-- =============================================================================
-- ShopCircle — product_likes
--
-- WHY A SEPARATE TABLE:
--   public.likes has `post_id references public.posts(id)`. A product is a row
--   in a DIFFERENT table, so it can never be the target of that foreign key —
--   which is exactly why the product card's heart was fake until now. Postgres
--   has no "point at either of these two tables" foreign key, so the honest
--   answer is a second join table with the same shape.
--
-- HOW TO RUN IT:
--   Supabase.com -> SQL Editor -> New query -> paste -> Run.
--   Safe to re-run ("if not exists" / "drop policy if exists").
-- =============================================================================

-- Same "join table" pattern as public.likes: no `id` column, because the row IS
-- the relationship. The primary key is the PAIR, so Postgres physically cannot
-- store two likes from one person on one product — no double-tap check needed
-- in the app.
create table if not exists public.product_likes (
  product_id uuid        not null
                         references public.products (id) on delete cascade,

  -- Stamped by the DB, never sent by the client (same trick as posts.user_id).
  user_id    uuid        not null default auth.uid()
                         references auth.users (id) on delete cascade,

  created_at timestamptz not null default now(),

  primary key (product_id, user_id)
);

-- The PK already indexes its LEFT-MOST column (product_id), so "who liked this
-- product" is fast. "What have I liked" filters on user_id, which is not
-- left-most, so it needs its own index.
create index if not exists product_likes_user_id_idx
  on public.product_likes (user_id);


alter table public.product_likes enable row level security;

-- READ: open, like every other read in the app — the feed shows counts to
-- everyone.
drop policy if exists "product likes are readable by everyone" on public.product_likes;
create policy "product likes are readable by everyone"
  on public.product_likes for select
  using (true);

-- INSERT: you can only like as yourself.
drop policy if exists "users like as themselves" on public.product_likes;
create policy "users like as themselves"
  on public.product_likes for insert
  with check (auth.uid() = user_id);

-- DELETE: unliking is deleting your own row.
drop policy if exists "users remove their own likes" on public.product_likes;
create policy "users remove their own likes"
  on public.product_likes for delete
  using (auth.uid() = user_id);

-- No UPDATE policy on purpose: a like has nothing to edit. You insert it or you
-- delete it, and a missing policy is how you deny the operation.
