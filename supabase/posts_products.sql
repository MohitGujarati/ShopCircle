-- =============================================================================
-- ShopCircle — schema for the two "create" screens
--
-- This single file backs ONLY:
--   • src/components/create/PostAdd.tsx     -> public.posts
--   • src/components/create/ProductAdd.tsx  -> public.products
--   • src/components/home/HomeFeed.tsx      -> public.likes, public.comments
--
-- HOW TO RUN IT (once):
--   Open your ShopCircle project on supabase.com -> SQL Editor -> New query,
--   paste this whole file, press "Run". Re-running is safe (it uses
--   "if not exists" / "drop policy if exists"), so you can edit and run again.
--
-- WHAT "RLS" MEANS (Row Level Security):
--   With RLS on, Postgres checks a policy for every row a user tries to read or
--   write. That's how we make sure a person can only edit THEIR OWN rows, even
--   though everyone shares one database. Supabase turns your logged-in user's id
--   into the function auth.uid() inside these policies.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- POSTS  (the "Add post" screen: a photo + caption, like an Instagram post)
-- -----------------------------------------------------------------------------
create table if not exists public.posts (
  id         uuid        primary key default gen_random_uuid(),

  -- Who created it. References the built-in auth.users table Supabase manages.
  -- Defaulting to auth.uid() means the row is auto-stamped with the logged-in
  -- user, so the app doesn't have to send it. ON DELETE CASCADE = if the account
  -- is deleted, their posts go too.
  user_id    uuid        not null default auth.uid()
                         references auth.users (id) on delete cascade,

  image_url  text,                                   -- the photo (URI for now)
  caption    text,                                   -- "Add a caption..."
  audience   text        not null default 'followers',
  ai_label   boolean     not null default false,     -- the "Add AI label" toggle

  created_at timestamptz not null default now()
);


-- -----------------------------------------------------------------------------
-- PRODUCTS  (the "Add product" screen — same idea, plus title/price)
-- -----------------------------------------------------------------------------
create table if not exists public.products (
  id          uuid          primary key default gen_random_uuid(),

  user_id     uuid          not null default auth.uid()
                            references auth.users (id) on delete cascade,

  image_url   text,
  title       text          not null,
  price       numeric(10,2) not null default 0,      -- money: 10 digits, 2 decimals
  description text,

  created_at  timestamptz   not null default now()
);


-- -----------------------------------------------------------------------------
-- LIKES  (the heart on a post card)
--
-- This is a "join table": it doesn't describe a thing, it describes a
-- RELATIONSHIP between two things — one user liking one post.
--
-- Note there is no `id` column. The primary key is the PAIR (post_id, user_id),
-- which is the whole trick: Postgres physically cannot store the same pair twice,
-- so "one like per user per post" is guaranteed by the DATABASE. The app doesn't
-- have to check first, and a double-tap can't create two likes.
-- -----------------------------------------------------------------------------
create table if not exists public.likes (
  -- ON DELETE CASCADE: delete a post and its likes go with it. Without this the
  -- likes would be orphaned rows pointing at a post that no longer exists.
  post_id    uuid        not null
                         references public.posts (id) on delete cascade,

  user_id    uuid        not null default auth.uid()
                         references auth.users (id) on delete cascade,

  created_at timestamptz not null default now(),

  primary key (post_id, user_id)
);

-- To UNLIKE, delete the row:
--   supabase.from('likes').delete().eq('post_id', id).eq('user_id', user.id)


-- -----------------------------------------------------------------------------
-- COMMENTS  (the speech-bubble on a post card)
--
-- Unlike `likes`, a comment IS a thing — it has text, and one user can leave many
-- comments on the same post. So it gets its own `id` and no unique constraint.
-- -----------------------------------------------------------------------------
create table if not exists public.comments (
  id         uuid        primary key default gen_random_uuid(),

  post_id    uuid        not null
                         references public.posts (id) on delete cascade,

  user_id    uuid        not null default auth.uid()
                         references auth.users (id) on delete cascade,

  -- `not null` + a length cap: the DB is the last line of defence for bad data,
  -- even if the UI already limits what can be typed.
  body       text        not null check (char_length(body) between 1 and 2200),

  created_at timestamptz not null default now()
);


-- -----------------------------------------------------------------------------
-- INDEXES
--
-- An index is a lookup shortcut. Without one, "find all comments for post X"
-- scans every comment in the table. With 20 rows that's instant; with 20,000
-- it's slow. Create them now so you never have to notice.
--
-- `likes` needs none for this: its primary key already indexes (post_id, user_id),
-- and an index works for the LEFT-most columns of its key — so post_id is covered.
-- -----------------------------------------------------------------------------
create index if not exists comments_post_id_idx
  on public.comments (post_id, created_at desc);

-- For "which posts has this user liked?" — the primary key can't help here,
-- because user_id is not the left-most column of it.
create index if not exists likes_user_id_idx
  on public.likes (user_id);


-- -----------------------------------------------------------------------------
-- Turn Row Level Security ON. Until we add policies below, this DENIES everything
-- by default — which is the safe starting point.
-- -----------------------------------------------------------------------------
alter table public.posts    enable row level security;
alter table public.products enable row level security;
alter table public.likes    enable row level security;
alter table public.comments enable row level security;


-- -----------------------------------------------------------------------------
-- Policies. Pattern for both tables:
--   • READ  (select): anyone logged in can see all rows — it's a social feed.
--   • WRITE (insert/update/delete): only the row's owner (user_id = auth.uid()).
-- "drop ... if exists" first so this file is safe to re-run after edits.
-- -----------------------------------------------------------------------------

-- posts ----------------------------------------------------------------------
drop policy if exists "posts are readable by everyone"   on public.posts;
create policy "posts are readable by everyone"
  on public.posts for select
  using (true);

drop policy if exists "users insert their own posts"     on public.posts;
create policy "users insert their own posts"
  on public.posts for insert
  with check (auth.uid() = user_id);

drop policy if exists "users update their own posts"     on public.posts;
create policy "users update their own posts"
  on public.posts for update
  using (auth.uid() = user_id);

drop policy if exists "users delete their own posts"     on public.posts;
create policy "users delete their own posts"
  on public.posts for delete
  using (auth.uid() = user_id);

-- products -------------------------------------------------------------------
drop policy if exists "products are readable by everyone" on public.products;
create policy "products are readable by everyone"
  on public.products for select
  using (true);

drop policy if exists "users insert their own products"   on public.products;
create policy "users insert their own products"
  on public.products for insert
  with check (auth.uid() = user_id);

drop policy if exists "users update their own products"    on public.products;
create policy "users update their own products"
  on public.products for update
  using (auth.uid() = user_id);

drop policy if exists "users delete their own products"    on public.products;
create policy "users delete their own products"
  on public.products for delete
  using (auth.uid() = user_id);

-- likes ----------------------------------------------------------------------
-- Read is open so every card can show its like count and whether YOU liked it.
-- There's no update policy: a like has nothing to edit — you insert it or you
-- delete it. Leaving the policy out means updates are denied, which is correct.
drop policy if exists "likes are readable by everyone"     on public.likes;
create policy "likes are readable by everyone"
  on public.likes for select
  using (true);

drop policy if exists "users insert their own likes"       on public.likes;
create policy "users insert their own likes"
  on public.likes for insert
  with check (auth.uid() = user_id);

-- This is what makes unlike safe: you can only delete a row that is YOURS, so
-- nobody can remove someone else's like.
drop policy if exists "users delete their own likes"       on public.likes;
create policy "users delete their own likes"
  on public.likes for delete
  using (auth.uid() = user_id);

-- comments -------------------------------------------------------------------
drop policy if exists "comments are readable by everyone"  on public.comments;
create policy "comments are readable by everyone"
  on public.comments for select
  using (true);

drop policy if exists "users insert their own comments"    on public.comments;
create policy "users insert their own comments"
  on public.comments for insert
  with check (auth.uid() = user_id);

drop policy if exists "users update their own comments"    on public.comments;
create policy "users update their own comments"
  on public.comments for update
  using (auth.uid() = user_id);

drop policy if exists "users delete their own comments"    on public.comments;
create policy "users delete their own comments"
  on public.comments for delete
  using (auth.uid() = user_id);


-- =============================================================================
-- HOW THE APP WILL READ THIS (for when we wire the UI)
--
-- Because likes.post_id and comments.post_id are real foreign keys, Supabase can
-- fetch a post AND its counts in ONE request — no second query per card:
--
--   supabase.from('posts').select('*, likes(count), comments(count)')
--
-- …which comes back as `likes: [{ count: 12 }]` on each post.
--
-- To also know whether *you* liked a post, embed your own row and check if the
-- array is empty:
--
--   .select('*, likes(count), comments(count), my_like:likes(user_id)')
--   .eq('my_like.user_id', user.id)
-- =============================================================================
