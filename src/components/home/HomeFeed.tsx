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
    View,
} from 'react-native';

// One post as the FEED needs it: the `posts` columns plus the counts and the
// "did I like this?" flag we work out at fetch time.
type Post = {
    id: string;
    user_id: string;
    image_url: string | null;
    caption: string | null;
    created_at: string;
    likeCount: number;
    commentCount: number;
    likedByMe: boolean;
    authorName: string;
};

// What the query above actually returns. Embedded counts come back as an array
// with one object in it: `likes: [{ count: 12 }]`. The embedded profile is a
// single object (or null) because posts.user_id has ONE foreign key to profiles.
type PostRow = {
    id: string;
    user_id: string;
    image_url: string | null;
    caption: string | null;
    created_at: string;
    likes: { count: number }[];
    comments: { count: number }[];
    profiles: { name: string | null; username: string | null } | null;
};

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

// ---------------------------------------------------------------------------
// IconButton — every icon in the action row is the same thing: an icon you can
// tap. One small component keeps the sizing and tap area identical for all.
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// PostCard — one post: author row, photo, actions, likes, caption.
// It holds no state: everything it shows comes from props, and taps are handed
// back up to HomeFeed which owns the list.
// ---------------------------------------------------------------------------
const PostCard = ({
    post,
    authorName,
    isMine,
    onToggleLike,
    onDelete,
}: {
    post: Post;
    authorName: string;
    isMine: boolean;
    onToggleLike: () => void;
    onDelete: () => void;
}) => (
    <View style={styles.card}>
        {/* AUTHOR ROW — no profiles table yet, so the avatar is the first
            letter of the name instead of a photo. */}
        <View style={styles.header}>
            <View style={styles.avatar}>
                <Text style={styles.avatarLetter}>{authorName.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.username}>{authorName}</Text>
            <View style={styles.spacer} />
            {/* Only your own posts get the menu — it has one item, and it's Delete. */}
            {isMine && (
                <IconButton
                    name="ellipsis-horizontal"
                    color={Colors.textSecondary}
                    onPress={onDelete}
                />
            )}
        </View>

        {/* PHOTO — square, edge to edge, like Instagram. */}
        {post.image_url && (
            <Image source={{ uri: post.image_url }} style={styles.photo} contentFit="cover" />
        )}

        {/* ACTION ROW */}
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

        {/* LIKES + CAPTION + COMMENTS + TIME */}
        <View style={styles.body}>
            <Text style={styles.likes}>
                {post.likeCount} {Strings.feed.likes}
            </Text>

            {/* Nested <Text> lets the bold username sit inline with the caption
                and wrap together as one paragraph. */}
            {post.caption ? (
                <Text style={styles.caption}>
                    <Text style={styles.username}>{authorName}</Text> {post.caption}
                </Text>
            ) : null}

            {post.commentCount > 0 && (
                <Text style={styles.meta}>
                    {Strings.feed.viewAll} {post.commentCount} {Strings.feed.comments}
                </Text>
            )}

            <Text style={styles.time}>{timeAgo(post.created_at)}</Text>
        </View>
    </View>
);

// ---------------------------------------------------------------------------
// HomeFeed — loads posts from Supabase and lists them.
// ---------------------------------------------------------------------------
export default function HomeFeed() {
    const { user } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    // `loading` is the full-screen spinner on first load; `refreshing` is the
    // small pull-to-refresh one. Separate, so a pull doesn't blank the list.
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadPosts = useCallback(async () => {
        setError(null);

        // Because likes.post_id and comments.post_id are real foreign keys,
        // Supabase can fetch each post AND its counts in ONE request — no extra
        // query per card.
        const { data, error } = await supabase
            .from('posts')
            .select('id, user_id, image_url, caption, created_at, likes(count), comments(count), profiles(name, username)')
            .order('created_at', { ascending: false });

        // Second query: the ids of the posts I have liked. One small round trip
        // is simpler to read than folding this into the query above.
        const { data: myLikes } = await supabase
            .from('likes')
            .select('post_id')
            .eq('user_id', user?.id ?? '');

        // A Set gives us an O(1) `.has()` check instead of scanning an array per card.
        const likedIds = new Set((myLikes ?? []).map((like) => like.post_id));

        if (error) {
            setError(error.message);
        } else {
            // Flatten `likes: [{count}]` into a plain number so the card stays dumb.
            setPosts(
                ((data ?? []) as unknown as PostRow[]).map((row) => ({
                    ...row,
                    likeCount: row.likes[0]?.count ?? 0,
                    commentCount: row.comments[0]?.count ?? 0,
                    likedByMe: likedIds.has(row.id),
                    // Name comes from the POST's profile, so it's the same on every
                    // device. Prefer the @handle, fall back to the display name.
                    authorName: row.profiles?.username ?? row.profiles?.name ?? 'shopcircle',
                })),
            );
        }

        setLoading(false);
        setRefreshing(false);
    }, [user?.id]);

    // useFocusEffect (not useEffect) so the feed refetches every time you come
    // back to this tab — that's how a post you just shared shows up right away.
    useFocusEffect(
        useCallback(() => {
            loadPosts();
        }, [loadPosts]),
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadPosts();
    };

    // Replace one post in the list, leaving the others untouched.
    const patchPost = (id: string, changes: Partial<Post>) =>
        setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...changes } : p)));

    // Like = insert a row, unlike = delete it. The (post_id, user_id) primary key
    // means the DB itself refuses a second like, so we never check first.
    const toggleLike = async (post: Post) => {
        if (!user) return;
        const liked = post.likedByMe;

        // Update the UI first ("optimistic"), so the heart fills instantly instead
        // of after the network round trip. If the write fails we reload and the
        // real state comes back.
        patchPost(post.id, {
            likedByMe: !liked,
            likeCount: post.likeCount + (liked ? -1 : 1),
        });

        const { error } = liked
            ? await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', user.id)
            : await supabase.from('likes').insert({ post_id: post.id });

        if (error) loadPosts();
    };

    // Ask first — deleting is not undoable.
    const confirmDelete = (post: Post) => {
        Alert.alert(Strings.feed.deleteTitle, Strings.feed.deleteBody, [
            { text: Strings.common.cancel, style: 'cancel' },
            {
                text: Strings.feed.delete,
                style: 'destructive',
                onPress: async () => {
                    const { error } = await supabase.from('posts').delete().eq('id', post.id);

                    // The RLS delete policy already limits this to your own posts —
                    // hiding the menu on other people's cards is just the UI half.
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
            keyExtractor={(post) => post.id}
            renderItem={({ item }) => (
                <PostCard
                    post={item}
                    authorName={item.authorName}
                    isMine={item.user_id === user?.id}
                    onToggleLike={() => toggleLike(item)}
                    onDelete={() => confirmDelete(item)}
                />
            )}
            showsVerticalScrollIndicator={false}
            // Pull down on the list to reload it.
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

    // PostCard
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
    photo: {
        width: '100%',
        aspectRatio: 1,
        backgroundColor: Colors.surfaceMuted,
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
