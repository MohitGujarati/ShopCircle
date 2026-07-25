-- =============================================================================
-- ShopCircle — profiles
--
-- WHY THIS FILE EXISTS:
--   Every post stores only a `user_id` (a UUID pointing at auth.users). But your
--   app CANNOT read other people's rows in auth.users — Supabase locks that table
--   down. So today the feed can only resolve YOUR OWN name and shows "shopcircle"
--   for everyone else (see src/components/home/HomeFeed.tsx -> authorName).
--
--   The fix is a PUBLIC table that mirrors the safe, shareable bits of each user:
--   their display name, handle, avatar. Everyone can read it, so any device can
--   look up any author. This is THE standard Supabase pattern.
--
-- HOW TO RUN IT (once):
--   Supabase.com -> your project -> SQL Editor -> New query -> paste this whole
--   file -> Run. Re-running is safe (uses "if not exists" / "drop ... if exists").
--   Run this AFTER posts_products.sql, because the last section links posts to it.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- PROFILES  (one row per user — the public face of an account)
--
-- The trick: `id` is BOTH the primary key AND a foreign key to auth.users. So a
-- profile can't exist without a real user, and it shares that user's UUID. There
-- is no separate "profile id" to keep in sync — profile.id == auth user id.
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid        primary key
                         references auth.users (id) on delete cascade,

  -- The display name shown on posts, e.g. "Mohit Gujarati". Copied from signup.
  name       text,

  -- The @handle, e.g. "mohit". Unique so two people can't claim the same one.
  -- Nullable for now: signup only collects a name; the onboarding screen sets
  -- this later. The feed falls back to `name` until a handle exists.
  username   text        unique,

  -- Public URL of the avatar image (Supabase Storage, added later). Until then
  -- the UI keeps drawing the first letter of the name.
  avatar_url text,

  -- Short "about me" line for the profile screen.
  bio        text,

  created_at timestamptz not null default now()
);


-- -----------------------------------------------------------------------------
-- Row Level Security. ON = deny everything until a policy allows it.
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;

-- READ: anyone logged in can see every profile. That's the whole point — the
-- feed on OTHER people's devices needs to read YOUR profile to show your name.
drop policy if exists "profiles are readable by everyone" on public.profiles;
create policy "profiles are readable by everyone"
  on public.profiles for select
  using (true);

-- INSERT: you may only create the profile whose id is your own user id. The
-- trigger below normally does this for you; this policy also lets the app do it.
drop policy if exists "users insert their own profile" on public.profiles;
create policy "users insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- UPDATE: you may only edit your own profile (name, username, avatar, bio).
drop policy if exists "users update their own profile" on public.profiles;
create policy "users update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- No DELETE policy: profiles die automatically with the user (ON DELETE CASCADE
-- above), so there's nothing for a person to delete by hand.


-- -----------------------------------------------------------------------------
-- AUTO-CREATE a profile the moment someone signs up.
--
-- A TRIGGER is "when X happens to a table, run this function". Here: after a new
-- row lands in auth.users (i.e. someone registers), insert a matching profile.
-- Without this, you'd have a logged-in user with no profile row, and their name
-- still wouldn't show. The trigger keeps the two tables in lockstep.
--
-- `new` is the auth.users row that was just inserted. `raw_user_meta_data` is the
-- JSONB where signUp() stashed our { name } (see useAuth.tsx). `->>` pulls a text
-- value out of that JSON.
--
-- SECURITY DEFINER: the function runs with the OWNER's rights, not the signing-up
-- user's — needed because at signup time there's no session yet to satisfy RLS.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, new.raw_user_meta_data ->> 'name');
  return new;
end;
$$;

-- Drop-then-create so this file stays safe to re-run.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();


-- -----------------------------------------------------------------------------
-- BACKFILL: the trigger only fires for FUTURE signups. The accounts you already
-- made (e.g. your two test devices) have no profile yet, so create one for each.
-- "on conflict do nothing" skips any user who somehow already has a profile.
-- -----------------------------------------------------------------------------
insert into public.profiles (id, name)
select id, raw_user_meta_data ->> 'name'
from auth.users
on conflict (id) do nothing;


-- -----------------------------------------------------------------------------
-- LINK posts -> profiles so the feed can fetch the author in ONE query.
--
-- posts.user_id already references auth.users. We add a SECOND foreign key to
-- profiles(id) (same UUID, so every existing row still points at a valid
-- profile — the backfill above guarantees it). This extra FK is what lets
-- Supabase/PostgREST "embed" the author:
--
--   supabase.from('posts')
--     .select('id, caption, ..., profiles(name, username, avatar_url)')
--
-- Without a declared relationship, that embed just errors.
-- -----------------------------------------------------------------------------
alter table public.posts
  drop constraint if exists posts_user_id_profiles_fkey;
alter table public.posts
  add constraint posts_user_id_profiles_fkey
  foreign key (user_id) references public.profiles (id) on delete cascade;

-- Same for products, so the profile grid / product cards can name their seller.
alter table public.products
  drop constraint if exists products_user_id_profiles_fkey;
alter table public.products
  add constraint products_user_id_profiles_fkey
  foreign key (user_id) references public.profiles (id) on delete cascade;

-- And comments, so a comment can show WHO wrote it, same one-query trick.
alter table public.comments
  drop constraint if exists comments_user_id_profiles_fkey;
alter table public.comments
  add constraint comments_user_id_profiles_fkey
  foreign key (user_id) references public.profiles (id) on delete cascade;