-- Storage policies for the `user-media` bucket.
-- Run this AFTER creating the bucket in the dashboard (Storage -> New bucket,
-- name: user-media, Public: on).
--
-- The bucket being "public" only makes READS open. Uploading a file is an INSERT
-- into the storage.objects table, which is deny-by-default under RLS -- so
-- without these policies nobody can upload anything.
--
-- Path convention these policies enforce:
--     posts/<user-id>/<timestamp>.jpg
--     avatars/<user-id>/<timestamp>.jpg
--
-- storage.foldername(name) splits the path into an array (1-indexed), so
-- [1] = 'posts' | 'avatars' and [2] = the owner's user id.
--
-- Safe to re-run: every drop uses `if exists`.

-- READ: anyone may read objects in this bucket.
drop policy if exists "user_media_read_all" on storage.objects;
create policy "user_media_read_all"
  on storage.objects for select
  using (bucket_id = 'user-media');

-- INSERT: a logged-in user may upload only inside a folder named after their own id.
drop policy if exists "user_media_insert_own" on storage.objects;
create policy "user_media_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'user-media'
    and (storage.foldername(name))[1] in ('posts', 'avatars')
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- UPDATE: only your own objects (needed for re-uploads / upsert).
drop policy if exists "user_media_update_own" on storage.objects;
create policy "user_media_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'user-media'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- DELETE: only your own objects (needed when a post is deleted).
drop policy if exists "user_media_delete_own" on storage.objects;
create policy "user_media_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'user-media'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
