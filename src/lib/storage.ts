import { supabase } from '@/lib/supabase';

const BUCKET = 'user-media';

// Must match the folder list in the storage RLS policy (supabase/storage.sql),
// or the upload is rejected. A union type means a typo fails to compile instead
// of failing at runtime.
type Folder = 'posts' | 'products' | 'avatars';

export async function uploadImage(
    localUri: string,
    folder: Folder,
    userId: string,
    // Two photos picked in the same millisecond would otherwise get the same
    // filename and the second would 409. The index makes each path unique.
    index = 0,
): Promise<string> {
    const filename = `${Date.now()}-${index}.jpg`;
    const path = `${folder}/${userId}/${filename}`;

    // Read the local file into raw bytes. Passing `localUri` straight to upload()
    // would store the *string* as the file's contents (a ~60 byte text file that
    // renders as a broken image). fetch works for file:// on device and blob: on web.
    const arraybuffer = await fetch(localUri).then((res) => res.arrayBuffer());

    // contentType is what makes the browser render it as an image instead of
    // treating it as a download.
    const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, arraybuffer, { contentType: 'image/jpeg' });

    if (error) throw error;

    // Synchronous — just builds the URL string, no network call, never errors.
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * Upload several photos and get their public URLs back IN THE SAME ORDER.
 *
 * Promise.all uploads them in parallel (one round trip instead of N sequential
 * ones) and — unlike a race — resolves to an array in the order the promises
 * were created, which is what keeps images[0] the cover photo the user chose.
 *
 * If any upload rejects, the whole thing rejects: the caller's try/catch then
 * skips the insert, so a post can't end up with half its photos.
 */
export async function uploadImages(
    localUris: string[],
    folder: Folder,
    userId: string,
): Promise<string[]> {
    return Promise.all(localUris.map((uri, i) => uploadImage(uri, folder, userId, i)));
}
