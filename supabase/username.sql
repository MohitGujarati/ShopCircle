-- =============================================================================
-- ShopCircle — usernames at signup + signing in with one
--
-- Builds on profiles.sql (run that first). Three things:
--   1. A format rule for usernames.
--   2. The signup trigger now copies `username` out of the signup metadata.
--   3. A function that turns a username into the account's email, so the login
--      screen can accept either.
--
-- HOW TO RUN IT:
--   Supabase.com -> SQL Editor -> New query -> paste -> Run. Safe to re-run.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 0. CLEAN THE EXISTING DATA FIRST
--
-- `add constraint ... check` is validated against every row that ALREADY
-- exists, and fails the whole statement if any of them break it:
--     ERROR: 23514: check constraint "profiles_username_format"
--            of relation "profiles" is violated by some row
-- That's the constraint doing its job — the data has to be fixed before the
-- rule can be enforced. Order matters: clean, THEN constrain.
--
-- To see what's wrong before changing anything:
--     select id, name, username from public.profiles
--     where username is not null and username !~ '^[a-z0-9_]{3,20}$';
--
-- The usual culprits are capitals and dots ("Mohit.Gujarati"), so first try to
-- salvage them: lowercase, swap anything illegal for "_", trim to 20 chars.
-- -----------------------------------------------------------------------------
update public.profiles
set username = left(regexp_replace(lower(username), '[^a-z0-9_]', '_', 'g'), 20)
where username is not null
  and username !~ '^[a-z0-9_]{3,20}$';

-- Anything still broken (too short to be legal, or now a duplicate of another
-- handle) is cleared. NULL is honest: that account simply has no handle yet and
-- can claim one from the Edit profile screen. It can still sign in by email.
update public.profiles
set username = null
where username is not null
  and username !~ '^[a-z0-9_]{3,20}$';

-- Duplicates would break the unique index further down. Keep the oldest claim
-- on each handle and clear the rest.
update public.profiles p
set username = null
where p.username is not null
  and exists (
    select 1 from public.profiles other
    where lower(other.username) = lower(p.username)
      and other.created_at < p.created_at
  );


-- -----------------------------------------------------------------------------
-- 1. FORMAT RULE
--
-- `username text unique` already exists in profiles.sql. This adds the shape:
-- lowercase letters, digits and underscore, 3-20 characters.
--
-- `username is null or ...` lets an account exist without a handle, which is
-- the state every account created before today is in.
-- -----------------------------------------------------------------------------
alter table public.profiles
  drop constraint if exists profiles_username_format;

alter table public.profiles
  add constraint profiles_username_format
  check (username is null or username ~ '^[a-z0-9_]{3,20}$');


-- Case-insensitive uniqueness. The plain `unique` from profiles.sql would let
-- "Mohit" and "mohit" both exist; this index makes them collide. The app also
-- lowercases before writing, so this is the backstop, not the mechanism.
create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username));


-- -----------------------------------------------------------------------------
-- 2. THE TRIGGER now copies the username too
--
-- Same function as profiles.sql, one extra column. `raw_user_meta_data` is the
-- JSONB where signUp()'s `options.data` lands, so { name, username } from the
-- client shows up here.
--
-- nullif(..., '') turns an empty string into NULL — otherwise "" would be
-- stored, fail the CHECK above, and abort the whole signup.
--
-- The display name falls back to the username, so a new account never shows a
-- blank name before onboarding exists.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_username text := nullif(lower(new.raw_user_meta_data ->> 'username'), '');
  meta_name     text := nullif(new.raw_user_meta_data ->> 'name', '');
begin
  insert into public.profiles (id, name, username)
  values (new.id, coalesce(meta_name, meta_username), meta_username);
  return new;
end;
$$;

-- The trigger itself is unchanged; recreating it keeps this file self-contained.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();


-- -----------------------------------------------------------------------------
-- 3. USERNAME -> EMAIL, so the login screen can take either
--
-- WHY A FUNCTION AND NOT A QUERY:
--   signInWithPassword() needs an email. Emails live in auth.users, which
--   Supabase does NOT expose to the client — by design. So the app cannot look
--   one up directly. `security definer` means this function runs with the
--   OWNER's rights, so it CAN read auth.users, while the caller still only gets
--   back the one value we choose to return.
--
--   The alternative — copying email into public.profiles — would publish every
--   user's email address to everyone, because that table is world-readable.
--
-- THE TRADE-OFF, stated plainly:
--   Anyone can call this with a guessed username and learn that account's email
--   address. That is a real (small) privacy leak, and it's the standard cost of
--   "log in with a username" on a client-only stack. The leak-free version does
--   the whole sign-in inside an Edge Function so the email never leaves the
--   server. Fine to defer, worth knowing you deferred it.
--
-- `stable` = doesn't modify anything, so Postgres may cache it within a query.
-- -----------------------------------------------------------------------------
create or replace function public.email_for_username(handle text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select u.email::text
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(p.username) = lower(handle)
  limit 1;
$$;

-- Lock it down to exactly who needs it. `anon` is the role of a logged-OUT
-- user — which is precisely who is sitting on the login screen.
revoke all on function public.email_for_username(text) from public;
grant execute on function public.email_for_username(text) to anon, authenticated;


-- -----------------------------------------------------------------------------
-- BACKFILL NOTE: existing accounts still have username = NULL, so they can only
-- sign in with their email until the Edit profile screen lets them claim one.
-- -----------------------------------------------------------------------------
