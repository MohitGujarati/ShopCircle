-- =============================================================================
-- ShopCircle — remove the email-lookup function
--
-- RUN THIS ONLY AFTER the `login` Edge Function is deployed AND you've signed
-- in with a username successfully. Dropping it first breaks username login.
--
-- WHY IT'S GOING AWAY:
--   public.email_for_username() (from username.sql §3) was granted to `anon` so
--   the logged-out login screen could resolve a handle to an email. Combined
--   with public.profiles being world-readable, that let ANY anonymous caller:
--
--       1. select username from profiles      -- every handle in the app
--       2. select email_for_username(handle)  -- ...and every email address
--
--   That's a complete email dump with no credentials. The Edge Function does
--   the same lookup with the service-role key, server-side, and never returns
--   the email — so this function has no reason to exist any more.
--
--   The lesson worth keeping: `security definer` hands your privileges to the
--   caller for the duration of the function. Every one you write is a hole you
--   are choosing to open, so the question is always "what can someone do with
--   this if they call it a million times?"
-- =============================================================================

drop function if exists public.email_for_username(text);


-- Verify it's gone: this should return no rows.
--   select proname from pg_proc
--   where proname = 'email_for_username';
