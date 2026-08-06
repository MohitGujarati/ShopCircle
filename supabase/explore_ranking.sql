-- =============================================================================
-- ShopCircle — ranked views for the Explore grids
--
-- WHY A VIEW:
--   Explore wants "most popular first", but popularity isn't a column — it's a
--   COUNT of rows in another table. You cannot .order() on something the query
--   doesn't select, and PostgREST can't sort by an embedded count either.
--
--   A VIEW is a saved SELECT that behaves like a table. Postgres does the
--   counting and the sorting; the app just reads `popularity` like any other
--   column. Nothing is duplicated — a view stores no data, it re-runs its
--   query every time.
--
-- HOW TO RUN IT:
--   Supabase.com -> SQL Editor -> New query -> paste -> Run. Safe to re-run.
--   ⚠ Run this BEFORE using the app, or Explore will fail: the client now asks
--   for posts_ranked / products_ranked, which don't exist until you do.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- POSTS — popularity = likes + comments
--
-- The subqueries group each child table ONCE and join the totals in. Counting
-- inside a correlated subquery per row would work too, but this shape stays
-- fast as the tables grow.
--
-- LEFT JOIN + coalesce(...,0) is the important pair: a post with no likes has
-- no row in the likes summary at all, so the join yields NULL — and NULL + 5
-- is NULL, which would sort unpredictably. coalesce turns "no rows" into 0.
--
-- security_invoker = on: the view runs with the RIGHTS OF THE CALLER, so the
-- RLS policies on posts/likes/comments still apply. Without it a view runs as
-- its owner and can quietly become a way around RLS — a classic mistake.
-- -----------------------------------------------------------------------------
create or replace view public.posts_ranked
with (security_invoker = on) as
select
  p.id,
  p.user_id,
  p.image_url,
  p.images,
  p.caption,
  p.created_at,
  coalesce(l.cnt, 0)                     as like_count,
  coalesce(c.cnt, 0)                     as comment_count,
  coalesce(l.cnt, 0) + coalesce(c.cnt, 0) as popularity
from public.posts p
left join (
  select post_id, count(*) as cnt from public.likes group by post_id
) l on l.post_id = p.id
left join (
  select post_id, count(*) as cnt from public.comments group by post_id
) c on c.post_id = p.id;


-- -----------------------------------------------------------------------------
-- PRODUCTS — interest = product_likes
--
-- Same shape. `interest` is just a friendlier name for the like count on
-- something that's for sale: it's people saying "I want this", not "nice photo".
-- -----------------------------------------------------------------------------
create or replace view public.products_ranked
with (security_invoker = on) as
select
  pr.id,
  pr.user_id,
  pr.image_url,
  pr.images,
  pr.title,
  pr.price,
  pr.description,
  pr.category,
  pr.condition,
  pr.location,
  pr.created_at,
  coalesce(pl.cnt, 0) as interest
from public.products pr
left join (
  select product_id, count(*) as cnt from public.product_likes group by product_id
) pl on pl.product_id = pr.id;


-- -----------------------------------------------------------------------------
-- Views inherit no grants, so say who may read them. anon is included because
-- the underlying read policies are open to everyone anyway.
-- -----------------------------------------------------------------------------
grant select on public.posts_ranked    to anon, authenticated;
grant select on public.products_ranked to anon, authenticated;


-- Check it worked — the most popular post first:
--   select id, like_count, comment_count, popularity
--   from public.posts_ranked order by popularity desc limit 5;
