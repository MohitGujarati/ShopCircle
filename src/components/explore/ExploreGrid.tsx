import PeopleResults from '@/components/explore/PeopleResults';
import { TRENDING_MIN_LIKES } from '@/constants/social';
import { INDEX, isAlgoliaReady, searchIndex } from '@/lib/algolia';
import { Strings } from '@/constants/strings';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    useWindowDimensions,
    View,
} from 'react-native';

type Kind = 'post' | 'product';

// One row of the grid, whichever view it came from. Posts carry engagement
// counts; products carry a price and an interest count. The tile reads which
// fields are present rather than being told what kind it's drawing.
type GridItem = {
    id: string;
    image_url: string | null;
    title?: string;
    price?: number | string;
    like_count?: number;
    comment_count?: number;
    popularity?: number;
    interest?: number;
};

// Everything that differs between the two tabs, in one place — so the rest of
// this file never branches on `kind`.
//
// Both read a VIEW, not a table (supabase/explore_ranking.sql). A view is a
// saved SELECT that behaves like a table, and it's what lets us .order() by a
// count that lives in a different table entirely.
const CONFIG: Record<
    Kind,
    {
        table: string;
        columns: string;
        searchColumn: string;
        rankColumn: string;
        algoliaIndex: string;
        empty: string;
    }
> = {
    post: {
        table: 'posts_ranked',
        columns: 'id, image_url, caption, created_at, like_count, comment_count, popularity',
        // Search the text people actually typed on that kind of row.
        searchColumn: 'caption',
        // likes + comments: what people did with it, not when it was made.
        rankColumn: 'popularity',
        algoliaIndex: INDEX.posts,
        empty: Strings.explore.emptyPosts,
    },
    product: {
        table: 'products_ranked',
        columns: 'id, image_url, title, price, created_at, interest',
        searchColumn: 'title',
        // "I want this" counts, from product_likes.
        rankColumn: 'interest',
        algoliaIndex: INDEX.products,
        empty: Strings.explore.emptyProducts,
    },
};

// What the Supabase connector puts in an Algolia record: the table's columns,
// plus objectID (Algolia's own key, set to the row's primary key).
type AlgoliaHit = {
    objectID: string;
    image_url?: string | null;
    title?: string;
    price?: number | string;
};

// Enough to fill several screens without pulling the whole table.
const PAGE_SIZE = 60;

// Don't search until the term is this long. One or two letters match nearly
// everything, so it's a wasted request and a useless screen of results.
const MIN_SEARCH_LENGTH = 3;

export default function ExploreGrid({ kind }: { kind: Kind }) {
    const config = CONFIG[kind];

    const [items, setItems] = useState<GridItem[]>([]);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { width } = useWindowDimensions();
    const tileSize = width / 3;

    const load = useCallback(
        async (search: string) => {
            setError(null);
            const term = search.trim();

            // TWO SOURCES, one for each job.
            //
            // Browsing (no term) reads the ranked view: Postgres knows the like
            // and comment counts, so it can order by popularity. Algolia can't —
            // the connector syncs table columns, not counts in other tables.
            //
            // Searching reads Algolia: typo tolerance, prefix matching and
            // relevance ranking, none of which ilike has.
            const useAlgolia = Boolean(term) && isAlgoliaReady && Boolean(config.algoliaIndex);

            try {
                if (useAlgolia) {
                    const hits = await searchIndex<AlgoliaHit>(config.algoliaIndex, term, PAGE_SIZE);

                    // objectID is the row's primary key, so these ids line up
                    // with the database exactly.
                    setItems(
                        hits.map((hit) => ({
                            id: hit.objectID,
                            image_url: hit.image_url ?? null,
                            title: hit.title,
                            price: hit.price,
                        })),
                    );
                } else {
                    // Built in steps rather than one chain, because the filter is
                    // conditional. Most engaged first, with created_at as the
                    // tie-breaker: among the many rows with zero likes the newest
                    // still floats to the top, instead of sitting in an arbitrary
                    // order behind everything else that also has nothing yet.
                    let request = supabase
                        .from(config.table)
                        .select(config.columns)
                        .order(config.rankColumn, { ascending: false })
                        .order('created_at', { ascending: false })
                        .limit(PAGE_SIZE);

                    // The fallback search, for a tab with no Algolia index.
                    // ilike = LIKE but case-insensitive; the % wildcards let the
                    // term appear anywhere in the text.
                    if (term) {
                        request = request.ilike(config.searchColumn, `%${term}%`);
                    }

                    const { data, error } = await request;
                    if (error) throw error;

                    setItems((data ?? []) as unknown as GridItem[]);
                }
            } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
                setItems([]);
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [config],
    );

    // Load ONCE, on mount. Deliberately not useFocusEffect like HomeFeed: the
    // feed is where you expect your new post to appear immediately, but Explore
    // is a browse surface — refetching every time you tab back would throw away
    // your scroll position and fire a query you didn't ask for.
    //
    // Every later fetch is something the user did on purpose: pull to refresh,
    // submit a search, or clear one.
    useEffect(() => {
        load('');
    }, [load]);

    // Search as you type, once there are enough letters to mean anything.
    //
    // Under 3 characters almost everything matches, so it's a wasted request
    // and a wall of irrelevant results. At 3+ we search on every keystroke,
    // debounced 250ms — each new letter cancels the previous timer, so "shoes"
    // is ONE request instead of five.
    useEffect(() => {
        const term = query.trim();
        if (term.length < MIN_SEARCH_LENGTH) return;

        const timer = setTimeout(() => load(term), 250);
        return () => clearTimeout(timer);
    }, [query, load]);

    const onRefresh = () => {
        setRefreshing(true);
        load(query);
    };

    // The keyboard's "search" key. Still wired when typing already searches —
    // it's how you dismiss the keyboard and see the grid.
    const onSearchSubmit = () => {
        setLoading(true);
        load(query);
    };

    const onClearSearch = () => {
        setQuery('');
        setLoading(true);
        load('');
    };

    return (
        <View style={styles.container}>
            <View style={styles.searchBar}>
                <Ionicons name="search" size={18} color={Colors.textSecondary} />
                <TextInput
                    style={styles.searchInput}
                    placeholder={Strings.explore.searchPlaceholder}
                    placeholderTextColor={Colors.textSecondary}
                    value={query}
                    onChangeText={setQuery}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="search"
                    onSubmitEditing={onSearchSubmit}
                />
                {query.length > 0 && (
                    <Ionicons
                        name="close-circle"
                        size={18}
                        color={Colors.textSecondary}
                        onPress={onClearSearch}
                    />
                )}
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator color={Colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={(item) => item.id}
                    numColumns={3}
                    // Matching accounts sit ABOVE the grid while searching, the
                    // way Instagram shows them. ListHeaderComponent scrolls with
                    // the rows instead of being pinned above them.
                    ListHeaderComponent={
                        kind === 'post' && query.trim().length >= MIN_SEARCH_LENGTH ? (
                            <PeopleResults query={query.trim()} />
                        ) : null
                    }
                    renderItem={({ item }) => (
                        <View style={[styles.tile, { width: tileSize, height: tileSize }]}>
                            {item.image_url ? (
                                <Image
                                    source={{ uri: item.image_url }}
                                    style={styles.tileImage}
                                    contentFit="cover"
                                />
                            ) : (
                                <View style={[styles.tileImage, styles.tilePlaceholder]}>
                                    <Ionicons
                                        name="image-outline"
                                        size={22}
                                        color={Colors.textSecondary}
                                    />
                                </View>
                            )}

                            {/* A trending product earns the badge; anything else
                                with interest shows the number. Both would be
                                noise, so it's one or the other. */}
                            {kind === 'product' &&
                                ((item.interest ?? 0) >= TRENDING_MIN_LIKES ? (
                                    <View style={[styles.overlayPill, styles.trendingPill]}>
                                        <Ionicons
                                            name="trending-up"
                                            size={11}
                                            color={Colors.onPrimary}
                                        />
                                        <Text style={styles.trendingText}>
                                            {Strings.product.trending}
                                        </Text>
                                    </View>
                                ) : (item.interest ?? 0) > 0 ? (
                                    <View style={styles.overlayPill}>
                                        <Ionicons name="trending-up" size={11} color={Colors.white} />
                                        <Text style={styles.overlayText}>{item.interest}</Text>
                                    </View>
                                ) : null)}

                            {/* Posts show what earned them their rank: likes,
                                then comments. Hidden entirely at zero — an
                                empty grid of "0"s says nothing. */}
                            {kind === 'post' && (item.popularity ?? 0) > 0 && (
                                <View style={styles.overlayPill}>
                                    <Ionicons name="heart" size={11} color={Colors.white} />
                                    <Text style={styles.overlayText}>{item.like_count ?? 0}</Text>
                                    {(item.comment_count ?? 0) > 0 && (
                                        <>
                                            <Ionicons
                                                name="chatbubble"
                                                size={10}
                                                color={Colors.white}
                                            />
                                            <Text style={styles.overlayText}>
                                                {item.comment_count}
                                            </Text>
                                        </>
                                    )}
                                </View>
                            )}

                            {item.price !== undefined && (
                                <View style={styles.pricePill}>
                                    <Text style={styles.priceText} numberOfLines={1}>
                                        ₹{item.price}
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    // Rendered in place of the rows when there are none.
                    ListEmptyComponent={
                        <View style={styles.centered}>
                            <Text style={styles.message}>
                                {error
                                    ? Strings.explore.loadFailed
                                    : query.trim()
                                      ? Strings.explore.noResults
                                      : config.empty}
                            </Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        margin: Spacing.md,
        paddingHorizontal: Spacing.md,
        height: 40,
        borderRadius: Radius.md,
        backgroundColor: Colors.surfaceMuted,
    },
    searchInput: {
        flex: 1,
        ...Typography.bodySm,
        color: Colors.text,
        // Keeps the text centred inside the fixed-height bar on Android.
        padding: 0,
    },
    centered: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: Spacing.xxl,
        paddingHorizontal: Spacing.xl,
    },
    message: {
        ...Typography.bodySm,
        color: Colors.textSecondary,
        textAlign: 'center',
    },

    // The 1px padding is what creates the hairline gutter between cells.
    tile: {
        padding: 1,
    },
    tileImage: {
        flex: 1,
        backgroundColor: Colors.surfaceMuted,
    },
    tilePlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Engagement sits top-left; the price sits bottom-left, so they never
    // collide on the same tile.
    overlayPill: {
        position: 'absolute',
        top: Spacing.xs,
        left: Spacing.xs,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: 'rgba(0,0,0,0.55)',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: Radius.full,
    },
    overlayText: {
        ...Typography.labelSm,
        fontSize: 11,
        color: Colors.white,
    },
    trendingPill: {
        backgroundColor: Colors.primary,
    },
    trendingText: {
        ...Typography.labelSm,
        fontSize: 11,
        color: Colors.onPrimary,
    },
    pricePill: {
        position: 'absolute',
        left: Spacing.xs,
        bottom: Spacing.xs,
        maxWidth: '85%',
        backgroundColor: 'rgba(0,0,0,0.65)',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: Radius.full,
    },
    priceText: {
        ...Typography.labelSm,
        color: Colors.white,
    },
});
