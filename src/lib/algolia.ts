// The Algolia search client. Same idea as lib/supabase.ts: create it once here
// and import it everywhere, never call algoliasearch() twice.
//
// WHY ALGOLIA AT ALL, when Postgres can already search?
//   `ilike '%watch%'` is a substring match. It can't handle a typo ("watchh"),
//   won't match "watches" from "watch", can't rank one hit above another, and
//   scans the table to do it. Algolia is a search engine: typo tolerance,
//   prefix matching as you type, and relevance ranking, in a few milliseconds.
//   The Supabase connector keeps the index in sync automatically, so the
//   database stays the source of truth and Algolia is just a fast read copy.

import { algoliasearch } from 'algoliasearch';

const appId = process.env.EXPO_PUBLIC_ALGOLIA_APP_ID;
// SEARCH-ONLY key. It ships inside the app, so it must be the restricted one —
// it can query indices and nothing else. The Admin key can DELETE your indices;
// it belongs on a server and never in a client bundle or a git repo.
const searchKey = process.env.EXPO_PUBLIC_ALGOLIA_SEARCH_KEY;

// Index names are set by the Supabase connector, and they're per-table.
export const INDEX = {
    products: process.env.EXPO_PUBLIC_ALGOLIA_PRODUCTS_INDEX ?? '',
    posts: process.env.EXPO_PUBLIC_ALGOLIA_POSTS_INDEX ?? '',
    profiles: process.env.EXPO_PUBLIC_ALGOLIA_PROFILES_INDEX ?? '',
};

// Not throwing here, unlike lib/supabase.ts: Supabase is the app, but search is
// one feature. If the keys are missing we fall back to the database search
// rather than crashing the whole screen — see isAlgoliaReady below.
export const isAlgoliaReady = Boolean(appId && searchKey);

const client = isAlgoliaReady ? algoliasearch(appId!, searchKey!) : null;

/**
 * Run one query against one index and return the raw hits.
 *
 * Every hit carries `objectID` — Algolia's own id, which the connector sets to
 * the row's primary key. That's the thread back to Postgres if you later need
 * the full row.
 */
export async function searchIndex<T>(indexName: string, query: string, hitsPerPage = 60) {
    if (!client || !indexName) return [] as T[];

    const { hits } = await client.searchSingleIndex<T>({
        indexName,
        searchParams: { query, hitsPerPage },
    });

    return hits;
}
