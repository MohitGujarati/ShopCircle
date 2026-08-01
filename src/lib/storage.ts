import { supabase } from '@/lib/supabase';

const BUCKET = 'user-media';

export async function uploadImage(
    localUri: string,
    folder: 'posts' | 'avatars',
    userId: string,
): Promise<string> {
    const filename = `${Date.now()}.jpg`;
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
