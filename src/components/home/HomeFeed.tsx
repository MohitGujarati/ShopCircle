import { Strings } from '@/constants/strings';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';


import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';

// The feed mixes posts and products, so it's a discriminated union: check
// `kind` and TypeScript knows which of the two you're holding.
type FeedItemBase = {
    id: string;
    user_id: string;
    images: string[];
    created_at: string;
    authorName: string;
};

type PostItem = FeedItemBase & {
    kind: 'post';
    caption: string | null;
    likeCount: number;
    commentCount: number;
    likedByMe: boolean;
};

type ProductItem = FeedItemBase & {
    kind: 'product';
    title: string;
    price: number | string;
    description: string | null;
    condition: string | null;
    location: string | null;
    avatarUrl: string | null;
    likeCount: number;
    likedByMe: boolean;
};

// How many likes make a product "trending". An arbitrary line, but a visible
// one: keep it here rather than buried in the card so it's easy to tune.
const TRENDING_MIN_LIKES = 3;

type FeedItem = PostItem | ProductItem;


// Embedded counts come back as an array with one object in it:
// `likes: [{ count: 12 }]`. The embedded profile is a single object (or null).
type PostRow = {
    id: string;
    user_id: string;
    image_url: string | null;
    images: string[] | null;
    caption: string | null;
    created_at: string;
    likes: { count: number }[];
    comments: { count: number }[];
    profiles: { name: string | null; username: string | null } | null;
};

// Old rows predate the `images` column, so both row types fall back to
// image_url via toImages() below.
type ProductRow = {
    id: string;
    user_id: string;
    image_url: string | null;
    images: string[] | null;
    title: string;
    price: number | string;
    description: string | null;
    condition: string | null;
    location: string | null;
    created_at: string;
    product_likes: { count: number }[];
    profiles: { name: string | null; username: string | null; avatar_url: string | null } | null;
};

// A row's photos, newest schema first. Rows written before the `images` column
// existed only have image_url, and a row can have neither.
const toImages = (row: { images: string[] | null; image_url: string | null }) =>
    row.images?.length ? row.images : row.image_url ? [row.image_url] : [];

// created_at is an ISO timestamp; the feed wants "3h ago".
function timeAgo(iso: string) {
    const seconds = (Date.now() - new Date(iso).getTime()) / 1000;
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}

const IconButton = ({
    name,
    onPress,
    color = Colors.text,
}: {
    name: keyof typeof Ionicons.glyphMap;
    onPress?: () => void;
    color?: string;
}) => (
    <TouchableOpacity onPress={onPress} hitSlop={8} activeOpacity={0.6}>
        <Ionicons name={name} size={26} color={color} />
    </TouchableOpacity>
);

// --- Shared card pieces ----------------------------------------------------

// `avatarUrl` and `subtitle` are optional so one component serves both cards:
// a post passes neither, a product passes a seller photo and a location.
const CardHeader = ({
    authorName,
    isMine,
    onDelete,
    avatarUrl = null,
    subtitle = null,
}: {
    authorName: string;
    isMine: boolean;
    onDelete: () => void;
    avatarUrl?: string | null;
    subtitle?: string | null;
}) => (
    <View style={styles.header}>
        {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" />
        ) : (
            <View style={styles.avatar}>
                <Text style={styles.avatarLetter}>{authorName.charAt(0).toUpperCase()}</Text>
            </View>
        )}

        <View style={styles.spacerColumn}>
            <Text style={styles.username}>{authorName}</Text>
            {subtitle ? (
                <View style={styles.subtitleRow}>
                    <Ionicons name="location-outline" size={12} color={Colors.textSecondary} />
                    <Text style={styles.subtitle}>{subtitle}</Text>
                </View>
            ) : null}
        </View>

        {isMine && (
            <IconButton name="ellipsis-horizontal" color={Colors.textSecondary} onPress={onDelete} />
        )}
    </View>
);

// One photo renders as a plain Image; several become a swipeable pager with
// dots. `pagingEnabled` + a page-width item is what makes it snap per photo
// instead of scrolling freely.
const CardPhotos = ({ uris }: { uris: string[] }) => {
    const { width } = useWindowDimensions();
    const [index, setIndex] = useState(0);

    if (uris.length === 0) return null;
    if (uris.length === 1) {
        return <Image source={{ uri: uris[0] }} style={styles.photo} contentFit="cover" />;
    }

    return (
        <View>
            <FlatList
                data={uris}
                keyExtractor={(uri, i) => `${uri}-${i}`}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                // Which page we're on = how far we've scrolled / one page width.
                onMomentumScrollEnd={(e) =>
                    setIndex(Math.round(e.nativeEvent.contentOffset.x / width))
                }
                renderItem={({ item }) => (
                    <Image source={{ uri: item }} style={[styles.photo, { width }]} contentFit="cover" />
                )}
            />

            <View style={styles.counter}>
                <Text style={styles.counterText}>
                    {index + 1}/{uris.length}
                </Text>
            </View>

            <View style={styles.dots}>
                {uris.map((uri, i) => (
                    <View key={`${uri}-${i}`} style={[styles.dot, i === index && styles.dotActive]} />
                ))}
            </View>
        </View>
    );
};

// The nested <Text> is what makes the bold name and the text wrap together as
// one paragraph instead of two blocks.
const AuthoredText = ({ authorName, text }: { authorName: string; text: string | null }) =>
    text ? (
        <Text style={styles.caption}>
            <Text style={styles.username}>{authorName}</Text> {text}
        </Text>
    ) : null;

const PostCard = ({
    post,
    isMine,
    onToggleLike,
    onDelete,
}: {
    post: PostItem;
    isMine: boolean;
    onToggleLike: () => void;
    onDelete: () => void;
}) => (
    <View style={styles.card}>
        <CardHeader authorName={post.authorName} isMine={isMine} onDelete={onDelete} />
        <CardPhotos uris={post.images} />

        <View style={styles.actions}>
            <IconButton
                name={post.likedByMe ? 'heart' : 'heart-outline'}
                color={post.likedByMe ? Colors.primary : Colors.text}
                onPress={onToggleLike}
            />
            <IconButton name="chatbubble-outline" />
            <IconButton name="paper-plane-outline" />
            <View style={styles.spacer} />
            <IconButton name="bookmark-outline" />
        </View>

        <View style={styles.body}>
            <Text style={styles.likes}>
                {post.likeCount} {Strings.feed.likes}
            </Text>

            <AuthoredText authorName={post.authorName} text={post.caption} />

            {post.commentCount > 0 && (
                <Text style={styles.meta}>
                    {Strings.feed.viewAll} {post.commentCount} {Strings.feed.comments}
                </Text>
            )}

            <Text style={styles.time}>{timeAgo(post.created_at)}</Text>
        </View>
    </View>
);

const ProductCard = ({
    product,
    isMine,
    onToggleLike,
    onDelete,
}: {
    product: ProductItem;
    isMine: boolean;
    onToggleLike: () => void;
    onDelete: () => void;
}) => {
    const isTrending = product.likeCount >= TRENDING_MIN_LIKES;

    return (
        <View style={styles.card}>
            <CardHeader
                authorName={product.authorName}
                avatarUrl={product.avatarUrl}
                subtitle={product.location}
                isMine={isMine}
                onDelete={onDelete}
            />

            <View>
                <CardPhotos uris={product.images} />
                {isTrending && (
                    <View style={styles.trendingBadge}>
                        <Ionicons name="trending-up" size={12} color={Colors.onPrimary} />
                        <Text style={styles.trendingText}>{Strings.product.trending}</Text>
                    </View>
                )}
            </View>

            <View style={styles.actions}>
                <IconButton name="paper-plane-outline" />
                <IconButton
                    name="trending-up"
                    color={product.likedByMe ? Colors.primary : Colors.text}
                    onPress={onToggleLike}
                />
                <View style={styles.spacer} />
                <TouchableOpacity style={styles.buyButton} activeOpacity={0.85}>
                    <Text style={styles.buyText}>{Strings.common.buyNow}</Text>
                </TouchableOpacity>
                <IconButton name="bookmark-outline" />
            </View>

            <View style={styles.productRow}>
                {product.likeCount > 0 && (
                    <Text style={styles.likes}>
                        {product.likeCount} {Strings.product.interested}
                    </Text>
                )}

                <Text style={styles.productTitle} numberOfLines={1}>
                    {product.title}
                </Text>

                <View style={styles.priceLine}>
                    <Text style={styles.productPrice}>₹{product.price}</Text>
                    {product.condition ? (
                        <Text style={styles.conditionText}>· {product.condition}</Text>
                    ) : null}
                </View>
            </View>

            <View style={styles.body}>
                <AuthoredText authorName={`${product.authorName}:`} text={product.description} />
                <Text style={styles.time}>{timeAgo(product.created_at)}</Text>
            </View>
        </View>
    );
};

export default function HomeFeed() {
    const { user } = useAuth();
    const [posts, setPosts] = useState<FeedItem[]>([]);
    // `loading` is the first-load spinner; `refreshing` is pull-to-refresh.
    // Separate, so a pull doesn't blank the list you're reading.
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadPosts = useCallback(async () => {
        setError(null);

        // likes.post_id and comments.post_id are real foreign keys, so Supabase
        // can fetch each post AND its counts in one request — no query per card.
        const { data, error } = await supabase
            .from('posts')
            .select('id, user_id, image_url, images, caption, created_at, likes(count), comments(count), profiles(name, username)')
            .order('created_at', { ascending: false });

        const { data: productData } = await supabase
            .from('products')
            .select(
                'id, user_id, image_url, images, title, price, description, condition, location, created_at, product_likes(count), profiles(name, username, avatar_url)',
            )
            .order('created_at', { ascending: false });

        const { data: myLikes } = await supabase
            .from('likes')
            .select('post_id')
            .eq('user_id', user?.id ?? '');

        const { data: myProductLikes } = await supabase
            .from('product_likes')
            .select('product_id')
            .eq('user_id', user?.id ?? '');

        // A Set gives an O(1) .has() check instead of scanning an array per card.
        const likedIds = new Set((myLikes ?? []).map((like) => like.post_id));
        const likedProductIds = new Set((myProductLikes ?? []).map((like) => like.product_id));

        if (error) {
            setError(error.message);
        } else {
            const postItems: PostItem[] = ((data ?? []) as unknown as PostRow[]).map((row) => ({
                ...row,
                kind: 'post',
                images: toImages(row),
                likeCount: row.likes[0]?.count ?? 0,
                commentCount: row.comments[0]?.count ?? 0,
                likedByMe: likedIds.has(row.id),
                // From the POST's profile, so the name is the same on every device.
                authorName: row.profiles?.username ?? row.profiles?.name ?? 'shopcircle',
            }));

            const productItems: ProductItem[] = ((productData ?? []) as unknown as ProductRow[]).map(
                (row) => ({
                    kind: 'product',
                    id: row.id,
                    user_id: row.user_id,
                    images: toImages(row),
                    created_at: row.created_at,
                    authorName: row.profiles?.username ?? row.profiles?.name ?? 'shopcircle',
                    title: row.title,
                    price: row.price,
                    description: row.description,
                    condition: row.condition,
                    location: row.location,
                    avatarUrl: row.profiles?.avatar_url ?? null,
                    likeCount: row.product_likes[0]?.count ?? 0,
                    likedByMe: likedProductIds.has(row.id),
                }),
            );

            // Merging two sorted lists doesn't keep them sorted — sort the result.
            setPosts(
                [...postItems, ...productItems].sort(
                    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
                ),
            );
        }

        setLoading(false);
        setRefreshing(false);
    }, [user?.id]);

    // useFocusEffect, not useEffect: tab screens stay mounted, so this is what
    // makes a post you just shared show up when you come back to the tab.
    useFocusEffect(
        useCallback(() => {
            loadPosts();
        }, [loadPosts]),
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadPosts();
    };

    // The `kind === 'post'` guard is what lets TypeScript spread PostItem fields
    // into a list that also holds products.
    const patchPost = (id: string, changes: Partial<PostItem>) =>
        setPosts((prev) =>
            prev.map((p) => (p.id === id && p.kind === 'post' ? { ...p, ...changes } : p)),
        );

    // Like = insert a row, unlike = delete it. The (post_id, user_id) primary key
    // means the DB itself refuses a second like, so we never check first.
    const toggleLike = async (post: PostItem) => {
        if (!user) return;
        const liked = post.likedByMe;

        // Optimistic: fill the heart now, reload and take the real state if the
        // write fails.
        patchPost(post.id, {
            likedByMe: !liked,
            likeCount: post.likeCount + (liked ? -1 : 1),
        });

        const { error } = liked
            ? await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', user.id)
            : await supabase.from('likes').insert({ post_id: post.id });

        if (error) loadPosts();
    };

    // Same shape as toggleLike, against product_likes. Kept separate rather than
    // parameterised: two tables, two id columns, and the guard below differs.
    const toggleProductLike = async (product: ProductItem) => {
        if (!user) return;
        const liked = product.likedByMe;

        setPosts((prev) =>
            prev.map((p) =>
                p.id === product.id && p.kind === 'product'
                    ? { ...p, likedByMe: !liked, likeCount: p.likeCount + (liked ? -1 : 1) }
                    : p,
            ),
        );

        const { error } = liked
            ? await supabase
                  .from('product_likes')
                  .delete()
                  .eq('product_id', product.id)
                  .eq('user_id', user.id)
            : await supabase.from('product_likes').insert({ product_id: product.id });

        if (error) loadPosts();
    };

    const confirmDelete = (post: FeedItem) => {
        Alert.alert(Strings.feed.deleteTitle, Strings.feed.deleteBody, [
            { text: Strings.common.cancel, style: 'cancel' },
            {
                text: Strings.feed.delete,
                style: 'destructive',
                onPress: async () => {
                    // Two id spaces — deleting from the wrong table matches nothing.
                    const table = post.kind === 'product' ? 'products' : 'posts';
                    const { error } = await supabase.from(table).delete().eq('id', post.id);

                    // RLS already limits this to your own rows; hiding the menu on
                    // other people's cards is just the UI half.
                    if (error) Alert.alert(Strings.feed.deleteFailed, error.message);
                    else setPosts((prev) => prev.filter((p) => p.id !== post.id));
                },
            },
        ]);
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator color={Colors.primary} />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.centered}>
                <Text style={styles.message}>{Strings.feed.loadFailed}</Text>
                <TouchableOpacity onPress={loadPosts} activeOpacity={0.7}>
                    <Text style={styles.retry}>{Strings.common.retry}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <FlatList
            style={styles.list}
            data={posts}
            // Prefix with `kind` so a post and a product can't collide on key.
            keyExtractor={(post) => `${post.kind}-${post.id}`}
            renderItem={({ item }) =>
                item.kind === 'product' ? (
                    <ProductCard
                        product={item}
                        isMine={item.user_id === user?.id}
                        onToggleLike={() => toggleProductLike(item)}
                        onDelete={() => confirmDelete(item)}
                    />
                ) : (
                    <PostCard
                        post={item}
                        isMine={item.user_id === user?.id}
                        onToggleLike={() => toggleLike(item)}
                        onDelete={() => confirmDelete(item)}
                    />
                )
            }
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            // Rendered in place of the rows when `data` is empty.
            ListEmptyComponent={
                <View style={styles.centered}>
                    <Text style={styles.message}>{Strings.feed.empty}</Text>
                </View>
            }
        />
    );
}

const styles = StyleSheet.create({
    list: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: Spacing.xxl,
        paddingHorizontal: Spacing.xl,
        gap: Spacing.md,
    },
    message: {
        ...Typography.bodySm,
        color: Colors.textSecondary,
        textAlign: 'center',
    },
    retry: {
        ...Typography.labelBold,
        color: Colors.primary,
    },

    // Shared by both cards
    card: {
        paddingBottom: Spacing.md,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        gap: Spacing.sm,
    },
    avatar: {
        width: 34,
        height: 34,
        borderRadius: Radius.full,
        backgroundColor: Colors.surfaceMuted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarLetter: {
        ...Typography.labelBold,
        color: Colors.textSecondary,
    },
    username: {
        ...Typography.labelBold,
        color: Colors.text,
    },
    // Pushes whatever comes after it to the far right of the row.
    spacer: {
        flex: 1,
    },
    spacerColumn: {
        flex: 1,
    },
    photo: {
        width: '100%',
        aspectRatio: 1,
        backgroundColor: Colors.surfaceMuted,
    },
    // "2/5" pill, top-right of the pager.
    counter: {
        position: 'absolute',
        top: Spacing.sm,
        right: Spacing.sm,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: Radius.full,
    },
    counterText: {
        ...Typography.labelSm,
        color: Colors.white,
    },
    dots: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: Spacing.xs,
        paddingTop: Spacing.sm,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: Radius.full,
        backgroundColor: Colors.border,
    },
    dotActive: {
        backgroundColor: Colors.primary,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        gap: Spacing.lg,
    },
    body: {
        paddingHorizontal: Spacing.md,
        gap: Spacing.xs,
    },

    // ProductCard
    subtitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        marginTop: 1,
    },
    subtitle: {
        ...Typography.labelSm,
        color: Colors.textSecondary,
    },
    // Sits on the photo's bottom-left corner — the parent View is what it's
    // positioned against, which is why the photo is wrapped.
    trendingBadge: {
        position: 'absolute',
        left: Spacing.md,
        bottom: Spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
        borderRadius: Radius.full,
    },
    trendingText: {
        ...Typography.labelSm,
        color: Colors.onPrimary,
    },
    productRow: {
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.sm,
        gap: 2,
    },
    productTitle: {
        ...Typography.bodyLg,
        color: Colors.text,
    },
    priceLine: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: Spacing.xs,
    },
    // The price is the only emphasised thing on the card.
    productPrice: {
        ...Typography.bodyLg,
        fontWeight: '600',
        color: Colors.text,
    },
    conditionText: {
        ...Typography.labelSm,
        color: Colors.textSecondary,
    },
    // Sized to sit inline with the 26px icons without making the row taller.
    buyButton: {
        paddingVertical: Spacing.xs,
        paddingHorizontal: Spacing.lg,
        borderRadius: Radius.full,
        borderWidth: 1,
        borderColor: Colors.primary,
    },
    buyText: {
        ...Typography.labelBold,
        color: Colors.primary,
    },
    likes: {
        ...Typography.labelBold,
        color: Colors.text,
    },
    caption: {
        ...Typography.bodySm,
        color: Colors.text,
    },
    meta: {
        ...Typography.bodySm,
        color: Colors.textSecondary,
    },
    time: {
        ...Typography.labelSm,
        color: Colors.textSecondary,
    },
});
