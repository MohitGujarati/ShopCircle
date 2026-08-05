-- =============================================================================
-- ShopCircle — make the signup trigger understand Google accounts
--
-- Run AFTER username.sql (this replaces the same function).
--
-- WHY:
--   The trigger reads raw_user_meta_data, and what's in there depends on HOW
--   the account was created:
--
--     email signup  ->  { username }              (our own signUp call)
--     Google        ->  { full_name, name,
--                         avatar_url, picture,
--                         email, ... }            (whatever Google returns)
--
--   So a Google user currently lands with name = NULL and no avatar, even
--   though Google just handed us both. This reads the Google keys as
--   fallbacks — and picks up the profile photo for free.
--
--   username stays NULL for Google users: Google has no concept of one, and
--   ours must be unique, so they claim it on the Edit profile screen. The feed
--   already falls back to `name`, so nothing looks broken in the meantime.
-- =============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta          jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  meta_username text  := nullif(lower(meta ->> 'username'), '');
  -- coalesce picks the first value that isn't NULL, so this is a priority list:
  -- our own field first, then Google's two spellings.
  meta_name     text  := coalesce(
                           nullif(meta ->> 'name', ''),
                           nullif(meta ->> 'full_name', ''),
                           meta_username
                         );
  -- Supabase normalises Google's `picture` into `avatar_url`, but not on every
  -- provider version — read both and take whichever is there.
  meta_avatar   text  := coalesce(
                           nullif(meta ->> 'avatar_url', ''),
                           nullif(meta ->> 'picture', '')
                         );
begin
  insert into public.profiles (id, name, username, avatar_url)
  values (new.id, meta_name, meta_username, meta_avatar)
  -- A profile may already exist if this file's backfill ran, or if someone
  -- signs in with Google using an email that already had an account. Update
  -- rather than blow up: a failed trigger aborts the whole signup.
  on conflict (id) do update
    set name       = coalesce(public.profiles.name, excluded.name),
        avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
