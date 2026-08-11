import { Strings } from '@/constants/strings';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { INDEX, isAlgoliaReady, searchIndex } from '@/lib/algolia';
import { supabase } from '@/lib/supabase';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

// One matching account.
type Person = {
    id: string;
    username: string | null;
    name: string | null;
    avatar_url: string | null;
};

// An Algolia record is the profiles row plus objectID (Algolia's own key, which
// the Supabase connector sets to the row's primary key).
type PersonHit = Person & { objectID: string };

// Show a handful, like Instagram does. The grid below is the main event.
const MAX_PEOPLE = 5;

/**
 * The "Accounts" strip that appears above the posts grid while searching.
 *
 * It owns its own fetching — the parent just passes the search term down, so
 * neither component has to know how the other loads its data.
 */
export default function PeopleResults({ query }: { query: string }) {
    const [people, setPeople] = useState<Person[]>([]);

    useEffect(() => {
        // The parent only renders this component once the term is long enough,
        // but guard anyway so the component is safe to use anywhere.
        //
        // The lint rule warns about setState directly inside an effect (it can
        // cascade renders). Deferring by one tick makes the update async, which
        // is what the rule actually wants.
        if (!query.trim()) {
            queueMicrotask(() => setPeople([]));
            return;
        }

        // `cancelled` is the fix for a real bug: type "moh" then "mohi" quickly
        // and two requests are in flight. If the first one answers LAST, it
        // overwrites the newer results with older ones. The cleanup function
        // flips this flag, so a stale response is thrown away instead.
        let cancelled = false;

        async function findPeople() {
            const people = await searchPeople(query.trim());
            if (!cancelled) setPeople(people);
        }

        findPeople();
        return () => {
            cancelled = true;
        };
    }, [query]);

    if (people.length === 0) return null;

    return (
        <View style={styles.section}>
            <Text style={styles.heading}>{Strings.explore.accounts}</Text>

            {people.map((person) => {
                // Handle first, display name second — the same fallback chain the
                // feed uses, so one person reads the same way everywhere.
                const handle = person.username ?? person.name ?? 'shopcircle';

                return (
                    <View key={person.id} style={styles.row}>
                        {person.avatar_url ? (
                            <Image
                                source={{ uri: person.avatar_url }}
                                style={styles.avatar}
                                contentFit="cover"
                            />
                        ) : (
                            <View style={[styles.avatar, styles.avatarFallback]}>
                                <Text style={styles.avatarLetter}>
                                    {handle.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                        )}

                        <View style={styles.rowText}>
                            <Text style={styles.handle}>{handle}</Text>
                            {/* Only when it adds something — repeating the handle
                                underneath itself is noise. */}
                            {person.name && person.name !== handle ? (
                                <Text style={styles.name} numberOfLines={1}>
                                    {person.name}
                                </Text>
                            ) : null}
                        </View>
                    </View>
                );
            })}
        </View>
    );
}

/**
 * Find accounts matching `term`.
 *
 * Algolia when the profiles index is configured: it tolerates typos and matches
 * a name as you type it, which is exactly what searching for a person needs.
 * Otherwise Postgres, which can only do substring matching.
 */
async function searchPeople(term: string): Promise<Person[]> {
    if (isAlgoliaReady && INDEX.profiles) {
        const hits = await searchIndex<PersonHit>(INDEX.profiles, term, MAX_PEOPLE);
        return hits.map((hit) => ({
            id: hit.objectID,
            username: hit.username,
            name: hit.name,
            avatar_url: hit.avatar_url,
        }));
    }

    // Someone might type the handle OR the display name, so match both. .or()
    // takes PostgREST's filter syntax as one comma-separated string —
    // `column.operator.value`, and no spaces anywhere in it.
    const { data } = await supabase
        .from('profiles')
        .select('id, username, name, avatar_url')
        .or(`username.ilike.%${term}%,name.ilike.%${term}%`)
        .limit(MAX_PEOPLE);

    return (data ?? []) as Person[];
}

const styles = StyleSheet.create({
    section: {
        paddingBottom: Spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Colors.border,
        marginBottom: Spacing.sm,
    },
    heading: {
        ...Typography.labelBold,
        color: Colors.text,
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.sm,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: Radius.full,
        backgroundColor: Colors.surfaceMuted,
    },
    avatarFallback: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarLetter: {
        ...Typography.labelBold,
        color: Colors.textSecondary,
    },
    rowText: {
        flex: 1,
    },
    handle: {
        ...Typography.labelBold,
        color: Colors.text,
    },
    name: {
        ...Typography.bodySm,
        color: Colors.textSecondary,
    },
});
