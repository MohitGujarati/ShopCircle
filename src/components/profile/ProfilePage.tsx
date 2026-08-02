import { replace, Routes } from '@/app/navigation/nav';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ProfileTabs, { PostItem, ProductItem } from './ProfileTabs';

// ---------------------------------------------------------------------------
// TopBar — the row at the very top: username on the left, actions on the right.
// ---------------------------------------------------------------------------
const TopBar = ({ username }: { username: string }) => {
    const { signOut } = useAuth();

    // Sign out, then send the user to /login. We navigate explicitly because the
    // auth gate that bounces logged-out users only runs at "/" — it isn't mounted
    // while we're inside the tabs, so clearing the session alone wouldn't move us.
    const handleLogout = async () => {
        await signOut();
        replace(Routes.LOGIN);
    };

    return (
        <View style={styles.topBar}>
            <Text style={styles.topBarTitle}>{username}</Text>
            <View style={styles.topBarActions}>
                <TouchableOpacity hitSlop={8} onPress={handleLogout}>
                    <Ionicons name="git-compare-outline" size={26} color={Colors.text} />
                </TouchableOpacity>
                <TouchableOpacity hitSlop={8}>
                    <Ionicons name="menu-outline" size={28} color={Colors.text} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

// A single stat cell (value on top, label below). Kept tiny + reusable.
const Stat = ({ value, label }: { value: number; label: string }) => (
    <View style={styles.statItem}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
    </View>
);

// Mirrors the columns in public.profiles (see supabase/profiles.sql). We keep the
// DB's snake_case names so there's no mapping layer to keep in sync, and every
// field is nullable because that's the truth: only `name` is filled at signup —
// username / avatar_url / bio stay null until an onboarding screen sets them.
type ProfileData = {
    name: string | null;
    username: string | null;
    avatar_url: string | null;
    bio: string | null;
};

// ---------------------------------------------------------------------------
// ProfileDetails — avatar + stats, then name/bio, then action buttons.
// ---------------------------------------------------------------------------
const ProfileDetails = ({
    profileData,
    postCount,
}: {
    profileData?: ProfileData | null;
    postCount: number;
}) => {
    if (!profileData) return null;

    const { name, avatar_url, bio } = profileData;

    return (
        <View style={styles.details}>
            {/* Row: avatar + stats */}
            <View style={styles.detailsRow}>
                <View style={styles.avatarContainer}>
                    {avatar_url ? (
                        <Image source={{ uri: avatar_url }} style={styles.avatar} />
                    ) : (
                        // No avatar until onboarding uploads one — draw the first
                        // letter of the name, the same fallback the feed uses.
                        <View style={[styles.avatar, styles.avatarFallback]}>
                            <Text style={styles.avatarLetter}>
                                {(name ?? '?').charAt(0).toUpperCase()}
                            </Text>
                        </View>
                    )}
                    <View style={styles.addBadge}>
                        <Ionicons name="add" size={14} color={Colors.onPrimary} />
                    </View>
                </View>

                {/* `posts` is real — it's just the length of the array we fetched, so
                    it can never drift from the grid. followers/following stay 0 until
                    a `follows` table exists. */}
                <View style={styles.statsRow}>
                    <Stat value={postCount} label="posts" />
                    <Stat value={0} label="followers" />
                    <Stat value={0} label="following" />
                </View>
            </View>

            {/* Name + bio (full width). Skip the bio line entirely when it's null —
                an empty grey row reads as a bug. */}
            <Text style={styles.nameText}>{name ?? ''}</Text>
            {bio ? <Text style={styles.bioText}>{bio}</Text> : null}

            {/* Action buttons */}
            <View style={styles.actionRow}>
                <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
                    <Text style={styles.actionButtonText}>Edit profile</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
                    <Text style={styles.actionButtonText}>Share profile</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const ProfilePage = () => {
    const { user } = useAuth();
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [posts, setPosts] = useState<PostItem[]>([]);
    const [products, setProducts] = useState<ProductItem[]>([]);
    const [loading, setLoading] = useState(true);

    const loadProfile = useCallback(async () => {
        if (!user) return;

        // All three requests are independent, so fire them together and wait once.
        // Three sequential awaits would mean three round-trips (~600ms on mobile
        // data) for data that could have arrived in one.
        const [profileRes, postsRes, productsRes] = await Promise.all([
            // On `profiles` the primary key IS the user id (profiles.id === auth
            // user id), so we filter on `id` — not `user_id` like posts/products.
            // .single() returns ONE object instead of an array of one, and errors
            // if there isn't exactly one row — which would mean the signup trigger
            // in profiles.sql never fired, a real bug worth seeing.
            supabase
                .from('profiles')
                .select('name, username, avatar_url, bio')
                .eq('id', user.id)
                .single(),

            // NOTE: the read policy on posts is `using (true)` — the database will
            // happily return EVERYONE's posts. Narrowing to this user is the app's
            // job, via .eq(). RLS guards writes; these reads are open by design.
            supabase
                .from('posts')
                .select('id, image_url, created_at')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false }),

            // Products live in their own table with their own columns (title,
            // price) — that's what keeps the two tabs genuinely separate.
            supabase
                .from('products')
                .select('id, image_url, title, price, created_at')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false }),
        ]);

        if (profileRes.error) {
            console.warn('Could not load profile:', profileRes.error.message);
        } else {
            setProfile(profileRes.data);
        }

        // `?? []` matters: on error `data` is null, and a null would crash the
        // FlatList in step 3. An empty array just renders the empty state.
        if (postsRes.error) console.warn('Could not load posts:', postsRes.error.message);
        setPosts(postsRes.data ?? []);

        if (productsRes.error) console.warn('Could not load products:', productsRes.error.message);
        setProducts(productsRes.data ?? []);

        setLoading(false);
    }, [user?.id]);

    // Tab screens stay mounted, so useEffect would run once and never again.
    // useFocusEffect refetches every time you come back to this tab — same
    // reasoning as HomeFeed.tsx.
    useFocusEffect(
        useCallback(() => {
            loadProfile();
        }, [loadProfile]),
    );

    if (loading) {
        return (
            <View style={[styles.page, styles.centered]}>
                <ActivityIndicator color={Colors.primary} />
            </View>
        );
    }

    // Handle falls back to the display name until onboarding sets a username.
    const handle = profile?.username ?? profile?.name ?? 'shopcircle';

    return (
        <View style={styles.page}>
            <TopBar username={handle} />
            <ProfileDetails profileData={profile} postCount={posts.length} />
            <ProfileTabs posts={posts} products={products} />
        </View>
    );
};

const styles = StyleSheet.create({
    page: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    centered: {
        alignItems: 'center',
        justifyContent: 'center',
    },

    // TopBar
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
    },
    topBarTitle: {
        ...Typography.headlineMd,
        color: Colors.text,
    },
    topBarActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.lg,
    },

    // ProfileDetails
    details: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.lg,
    },
    detailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        position: 'relative',
        marginRight: Spacing.xl,
    },
    avatar: {
        width: 84,
        height: 84,
        borderRadius: Radius.full,
        backgroundColor: Colors.surfaceMuted,
    },
    avatarFallback: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarLetter: {
        ...Typography.headlineMd,
        fontSize: 32,
        color: Colors.textSecondary,
    },
    addBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: Colors.primary,
        width: 24,
        height: 24,
        borderRadius: Radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: Colors.background,
    },
    statsRow: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        ...Typography.headlineMd,
        color: Colors.text,
    },
    statLabel: {
        ...Typography.bodySm,
        color: Colors.textSecondary,
    },
    nameText: {
        ...Typography.labelBold,
        fontSize: 15,
        color: Colors.text,
        marginTop: Spacing.lg,
    },
    bioText: {
        ...Typography.bodySm,
        color: Colors.text,
        marginTop: Spacing.xs,
    },

    // Action buttons
    actionRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginTop: Spacing.lg,
    },
    actionButton: {
        flex: 1,
        backgroundColor: Colors.surfaceMuted,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.md,
        alignItems: 'center',
    },
    actionButtonText: {
        ...Typography.labelBold,
        color: Colors.text,
    },
});

export default ProfilePage;
