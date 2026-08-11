import { goBack, openProduct } from '@/app/navigation/nav';
import { TRENDING_MIN_LIKES } from '@/constants/social';
import { Strings } from '@/constants/strings';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { formatPrice } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ===========================================================================
// TYPES
// ===========================================================================

type Seller = {
    name: string | null;
    username: string | null;
    avatar_url: string | null;
};

type Product = {
    id: string;
    user_id: string;
    image_url: string | null;
    images: string[] | null;
    title: string;
    price: number | string;
    description: string | null;
    category: string | null;
    condition: string | null;
    location: string | null;
    created_at: string;
    product_likes: { count: number }[];
    profiles: Seller | null;
};

/** A product by the same seller, for the strip at the bottom. */
type RelatedProduct = {
    id: string;
    image_url: string | null;
    title: string;
    price: number | string;
};

// ===========================================================================
// SMALL HELPERS
// ===========================================================================

/** "2026-08-06T..." -> "6 Aug 2026" */
const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** Colour variants aren't in the schema; these keep the layout honest-looking. */
const PLACEHOLDER_COLORS = ['#D9C3A9', '#A98D6E', '#3A3A3A'];

// ===========================================================================
// SECTION COMPONENTS
// Each one draws a single band of the page, top to bottom, and takes only what
// it needs. Keeping them here (rather than in another file) means you can read
// the whole screen in one scroll.
// ===========================================================================

/** Swipeable photos, with a counter and dots. */
const Gallery = ({ photos, width }: { photos: string[]; width: number }) => {
    const [index, setIndex] = useState(0);

    if (photos.length === 0) {
        return (
            <View style={[styles.galleryEmpty, { width, height: width }]}>
                <Ionicons name="image-outline" size={40} color={Colors.textSecondary} />
            </View>
        );
    }

    return (
        <View>
            <FlatList
                data={photos}
                keyExtractor={(uri, i) => `${uri}-${i}`}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                // Fires once the swipe settles; offset / width = which page.
                onMomentumScrollEnd={(e) =>
                    setIndex(Math.round(e.nativeEvent.contentOffset.x / width))
                }
                renderItem={({ item }) => (
                    <Image source={{ uri: item }} style={{ width, height: width }} contentFit="cover" />
                )}
            />

            {photos.length > 1 && (
                <>
                    <View style={styles.counter}>
                        <Text style={styles.counterText}>
                            {index + 1}/{photos.length}
                        </Text>
                    </View>
                    <View style={styles.dots}>
                        {photos.map((uri, i) => (
                            <View key={uri} style={[styles.dot, i === index && styles.dotActive]} />
                        ))}
                    </View>
                </>
            )}
        </View>
    );
};

/** Seller avatar + name + a real stat, and a Follow button that isn't wired. */
const SellerRow = ({
    seller,
    productCount,
    onFollow,
}: {
    seller: Seller | null;
    productCount: number;
    onFollow: () => void;
}) => {
    // Same fallback chain as the feed, so one person reads identically everywhere.
    const name = seller?.username ?? seller?.name ?? 'shopcircle';

    return (
        <View style={styles.sellerRow}>
            {seller?.avatar_url ? (
                <Image source={{ uri: seller.avatar_url }} style={styles.avatar} contentFit="cover" />
            ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarLetter}>{name.charAt(0).toUpperCase()}</Text>
                </View>
            )}

            <View style={styles.flex}>
                <Text style={styles.sellerName}>{name}</Text>
                {/* A REAL number instead of invented follower counts: how many
                    things this person has actually listed. */}
                <Text style={styles.muted}>
                    {productCount} {productCount === 1 ? 'listing' : 'listings'}
                </Text>
            </View>

            <TouchableOpacity style={styles.followButton} onPress={onFollow} activeOpacity={0.7}>
                <Text style={styles.followText}>{Strings.common.follow}</Text>
            </TouchableOpacity>
        </View>
    );
};

/** One "Label — value" line in the details block. */
const DetailRow = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.detailRow}>
        <Text style={styles.muted}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
    </View>
);

/** Horizontal strip of the seller's other items. Real data, real navigation. */
const MoreFromSeller = ({ items }: { items: RelatedProduct[] }) => {
    if (items.length === 0) return null;

    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>More from this seller</Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.relatedRow}
            >
                {items.map((item) => (
                    <TouchableOpacity
                        key={item.id}
                        style={styles.relatedCard}
                        activeOpacity={0.8}
                        // Replaces this screen's content with another product.
                        onPress={() => openProduct(item.id)}
                    >
                        {item.image_url ? (
                            <Image
                                source={{ uri: item.image_url }}
                                style={styles.relatedImage}
                                contentFit="cover"
                            />
                        ) : (
                            <View style={[styles.relatedImage, styles.galleryEmpty]} />
                        )}
                        <Text style={styles.relatedTitle} numberOfLines={1}>
                            {item.title}
                        </Text>
                        <Text style={styles.relatedPrice}>{formatPrice(item.price)}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
};

// ===========================================================================
// THE SCREEN
// ===========================================================================

export default function ProductDetail({ id }: { id: string }) {
    const { user } = useAuth();
    const { width } = useWindowDimensions();
    // The gesture bar / home indicator eats the bottom of the screen on modern
    // phones. insets.bottom is how much to keep clear so the buttons aren't
    // sitting under it — a fixed padding is wrong on half of all devices.
    const insets = useSafeAreaInsets();

    const [product, setProduct] = useState<Product | null>(null);
    const [related, setRelated] = useState<RelatedProduct[]>([]);
    const [sellerCount, setSellerCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [likeCount, setLikeCount] = useState(0);
    const [likedByMe, setLikedByMe] = useState(false);
    const [colorIndex, setColorIndex] = useState(0);
    const [quantity, setQuantity] = useState(1);

    // -- load ---------------------------------------------------------------

    const load = useCallback(async () => {
        // No setState before the first await: doing that inside an effect runs
        // synchronously and cascades renders. `loading` already starts true, and
        // opening another product pushes a fresh screen, so there's nothing to
        // reset here anyway.

        // The product, its seller and its like count in ONE request, via the
        // embeds the foreign keys make possible.
        const { data, error } = await supabase
            .from('products')
            .select(
                'id, user_id, image_url, images, title, price, description, category, condition, location, created_at, product_likes(count), profiles(name, username, avatar_url)',
            )
            .eq('id', id)
            .single();

        if (error || !data) {
            setError(error?.message ?? 'not found');
            setLoading(false);
            return;
        }

        const row = data as unknown as Product;
        setProduct(row);
        setLikeCount(row.product_likes[0]?.count ?? 0);

        // Everything else depends on knowing the seller, so it runs after — but
        // these three don't depend on each other, so they run together.
        const [likeRes, relatedRes, countRes] = await Promise.all([
            // Have I liked this? Only meaningful when logged in.
            user
                ? supabase
                    .from('product_likes')
                    .select('product_id')
                    .eq('product_id', id)
                    .eq('user_id', user.id)
                    .maybeSingle()
                : Promise.resolve({ data: null }),

            supabase
                .from('products')
                .select('id, image_url, title, price')
                .eq('user_id', row.user_id)
                // Don't recommend the page you're already on.
                .neq('id', id)
                .order('created_at', { ascending: false })
                .limit(10),

            // head: true fetches NO rows — just the count. Cheapest way to ask
            // "how many?" without downloading them.
            supabase
                .from('products')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', row.user_id),
        ]);

        setLikedByMe(Boolean(likeRes.data));
        setRelated((relatedRes.data ?? []) as RelatedProduct[]);
        setSellerCount(countRes.count ?? 0);
        setLoading(false);
        // The ID, not the whole `user` object — Supabase returns a new object on
        // every token refresh, which would refetch the product for no reason.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, user?.id]);

    // `id` is in load's deps, so opening another product from the strip refetches.
    useEffect(() => {
        // `load` is async and awaits the network before any setState, so it
        // doesn't cause the synchronous cascade this rule is about.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load();
    }, [load]);

    // -- actions ------------------------------------------------------------

    const toggleLike = async () => {
        if (!user || !product) return;
        const liked = likedByMe;

        // Optimistic: flip now, roll back if the write fails.
        setLikedByMe(!liked);
        setLikeCount((n) => n + (liked ? -1 : 1));

        const { error } = liked
            ? await supabase
                .from('product_likes')
                .delete()
                .eq('product_id', product.id)
                .eq('user_id', user.id)
            : await supabase.from('product_likes').insert({ product_id: product.id });

        if (error) {
            setLikedByMe(liked);
            setLikeCount((n) => n + (liked ? 1 : -1));
        }
    };

    // Genuinely works: React Native's Share opens the OS share sheet.
    const share = async () => {
        if (!product) return;
        await Share.share({
            message: `${product.title} — ${formatPrice(product.price)} on ShopCircle`,
        });
    };

    // No cart, no orders table, no payments. Say so rather than pretend.
    const notYet = () => Alert.alert(Strings.product.checkoutSoon, Strings.product.checkoutSoonBody);

    // -- render -------------------------------------------------------------

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator color={Colors.primary} />
            </View>
        );
    }

    if (error || !product) {
        return (
            <View style={styles.centered}>
                <Text style={styles.muted}>
                    {error === 'not found' ? Strings.product.notFound : Strings.product.loadFailed}
                </Text>
                <TouchableOpacity onPress={goBack}>
                    <Text style={styles.link}>Go back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Newest schema first, falling back to the single cover for older rows.
    const photos = product.images?.length
        ? product.images
        : product.image_url
            ? [product.image_url]
            : [];

    return (
        <View style={styles.page}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
                <Gallery photos={photos} width={width} />

                {/* Floating controls sit ON the photo, so the image gets the full
                    width — no header bar eating vertical space. */}
                <View style={styles.floatingBar} pointerEvents="box-none">
                    <TouchableOpacity style={styles.roundButton} onPress={goBack} hitSlop={8}>
                        <Ionicons name="arrow-back" size={22} color={Colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.roundButton} onPress={share} hitSlop={8}>
                        <Ionicons name="share-outline" size={20} color={Colors.text} />
                    </TouchableOpacity>
                </View>

                <SellerRow seller={product.profiles} productCount={sellerCount} onFollow={notYet} />

                <View style={styles.body}>
                    <Text style={styles.title}>{product.title}</Text>

                    <View style={styles.priceRow}>
                        <Text style={styles.price}>{formatPrice(product.price)}</Text>
                        {/* Where a star rating goes once reviews exist. It says
                            "no reviews" rather than inventing a 4.8. */}
                        <View style={styles.inlineRow}>
                            <Ionicons name="star-outline" size={14} color={Colors.textSecondary} />
                            <Text style={styles.muted}>{Strings.product.noReviews}</Text>
                        </View>
                    </View>

                    {/* Real metadata from the create form. */}
                    <View style={styles.chipRow}>
                        {product.condition && (
                            <View style={styles.chip}>
                                <Text style={styles.chipText}>{product.condition}</Text>
                            </View>
                        )}
                        {product.category && (
                            <View style={styles.chip}>
                                <Text style={styles.chipText}>{product.category}</Text>
                            </View>
                        )}
                        {likeCount >= TRENDING_MIN_LIKES && (
                            <View style={[styles.chip, styles.trendingChip]}>
                                <Ionicons name="trending-up" size={12} color={Colors.onPrimary} />
                                <Text style={styles.trendingText}>{Strings.product.trending}</Text>
                            </View>
                        )}
                    </View>

                    {product.description ? (
                        <Text style={styles.description}>{product.description}</Text>
                    ) : null}

                    <View style={styles.divider} />

                    {/* ENGAGEMENT — the heart writes to product_likes; share opens
                        the OS sheet; comments have no table for products. */}
                    <View style={styles.engagementRow}>
                        <TouchableOpacity style={styles.inlineRow} onPress={toggleLike}>
                            <Ionicons
                                name={likedByMe ? 'heart' : 'heart-outline'}
                                size={20}
                                color={likedByMe ? Colors.primary : Colors.text}
                            />
                            <Text style={styles.engagementText}>
                                {likeCount} {Strings.product.interested}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.inlineRow} onPress={share}>
                            <Ionicons name="paper-plane-outline" size={19} color={Colors.text} />
                            <Text style={styles.engagementText}>{Strings.common.share}</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.divider} />

                    {/* COLOUR — no variants table; tapping only moves the ring. */}
                    <Text style={styles.sectionTitle}>{Strings.product.color}</Text>
                    <View style={styles.swatchRow}>
                        {PLACEHOLDER_COLORS.map((color, i) => (
                            <TouchableOpacity
                                key={color}
                                onPress={() => setColorIndex(i)}
                                style={[
                                    styles.swatch,
                                    { backgroundColor: color },
                                    i === colorIndex && styles.swatchActive,
                                ]}
                            />
                        ))}
                    </View>

                    {/* QUANTITY — local only until there's a cart to put it in. */}
                    <Text style={styles.sectionTitle}>Quantity</Text>
                    <View style={styles.stepper}>
                        <TouchableOpacity
                            style={styles.stepperButton}
                            // Math.max stops it going below 1 without an if.
                            onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                        >
                            <Ionicons name="remove" size={18} color={Colors.text} />
                        </TouchableOpacity>
                        <Text style={styles.stepperValue}>{quantity}</Text>
                        <TouchableOpacity
                            style={styles.stepperButton}
                            onPress={() => setQuantity((q) => q + 1)}
                        >
                            <Ionicons name="add" size={18} color={Colors.text} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.divider} />

                    {/* DETAILS — every line here is real data. */}
                    <Text style={styles.sectionTitle}>Details</Text>
                    <View style={styles.detailsBlock}>
                        {product.category && <DetailRow label="Category" value={product.category} />}
                        {product.condition && (
                            <DetailRow label="Condition" value={product.condition} />
                        )}
                        {product.location && <DetailRow label="Location" value={product.location} />}
                        <DetailRow label="Listed" value={formatDate(product.created_at)} />
                    </View>
                </View>

                <MoreFromSeller items={related} />

                {/* Clears the fixed footer. */}
                <View style={{ height: Spacing.xxl * 3 }} />
            </ScrollView>

            {/* STICKY BUY BAR — the one thing that should never scroll away.
                Two rows: what it costs, then what you can do about it. */}
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
                <View style={styles.footerTop}>
                    <View>
                        <Text style={styles.muted}>Total</Text>
                        <Text style={styles.footerTotal}>
                            {formatPrice(Number(product.price) * quantity)}
                        </Text>
                    </View>

                    {/* Only worth saying once there's arithmetic to explain. */}
                    {quantity > 1 && (
                        <Text style={styles.muted}>
                            {quantity} × {formatPrice(product.price)}
                        </Text>
                    )}
                </View>

                <View style={styles.footerButtons}>
                    {/* Secondary action: outlined, so the eye goes to Buy now. */}
                    <TouchableOpacity style={styles.cartButton} activeOpacity={0.8} onPress={notYet}>
                        <Ionicons name="cart-outline" size={18} color={Colors.text} />
                        <Text style={styles.cartText}>{Strings.product.addToCart}</Text>
                    </TouchableOpacity>

                    {/* Primary action: solid, and given more width by flex 1.4. */}
                    <TouchableOpacity style={styles.buyButton} activeOpacity={0.85} onPress={notYet}>
                        <Text style={styles.buyText}>{Strings.product.buyNow}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

// ===========================================================================
// STYLES — grouped in the same order the components appear above.
// ===========================================================================

const styles = StyleSheet.create({
    page: { flex: 1, backgroundColor: Colors.background },
    scroll: { paddingBottom: Spacing.lg },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.md,
        backgroundColor: Colors.background,
    },
    flex: { flex: 1 },
    inlineRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: Colors.border,
        marginVertical: Spacing.md,
    },
    muted: { ...Typography.labelSm, color: Colors.textSecondary },
    link: { ...Typography.labelBold, color: Colors.primary },

    // Gallery
    galleryEmpty: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.surfaceMuted,
    },
    counter: {
        position: 'absolute',
        right: Spacing.md,
        bottom: Spacing.md,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: Radius.full,
        backgroundColor: 'rgba(0,0,0,0.55)',
    },
    counterText: { ...Typography.labelSm, color: Colors.white },
    dots: {
        position: 'absolute',
        bottom: Spacing.md,
        alignSelf: 'center',
        flexDirection: 'row',
        gap: Spacing.xs,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: Radius.full,
        backgroundColor: 'rgba(255,255,255,0.6)',
    },
    dotActive: { backgroundColor: Colors.white },

    // Floating back / share
    floatingBar: {
        position: 'absolute',
        top: Spacing.xxl + Spacing.md,
        left: Spacing.md,
        right: Spacing.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    roundButton: {
        width: 36,
        height: 36,
        borderRadius: Radius.full,
        backgroundColor: 'rgba(255,255,255,0.9)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Seller
    sellerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: Radius.full,
        backgroundColor: Colors.surfaceMuted,
    },
    avatarFallback: { alignItems: 'center', justifyContent: 'center' },
    avatarLetter: { ...Typography.labelBold, color: Colors.textSecondary },
    sellerName: { ...Typography.labelBold, color: Colors.text },
    followButton: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.full,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    followText: { ...Typography.labelBold, color: Colors.text },

    // Body
    body: { paddingHorizontal: Spacing.lg },
    title: { ...Typography.displayLg, color: Colors.text },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: Spacing.xs,
    },
    price: { ...Typography.displayLg, color: Colors.primary },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.md },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        paddingHorizontal: Spacing.md,
        paddingVertical: 4,
        borderRadius: Radius.full,
        backgroundColor: Colors.surfaceMuted,
    },
    chipText: { ...Typography.labelSm, color: Colors.textSecondary },
    trendingChip: { backgroundColor: Colors.primary },
    trendingText: { ...Typography.labelSm, color: Colors.onPrimary },
    description: {
        ...Typography.bodySm,
        color: Colors.textSecondary,
        marginTop: Spacing.md,
    },

    engagementRow: { flexDirection: 'row', gap: Spacing.xl },
    engagementText: { ...Typography.bodySm, color: Colors.text },

    sectionTitle: { ...Typography.labelBold, color: Colors.text, marginBottom: Spacing.sm },
    section: { marginTop: Spacing.lg, paddingLeft: Spacing.lg },

    swatchRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
    swatch: {
        width: 32,
        height: 32,
        borderRadius: Radius.full,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    swatchActive: { borderColor: Colors.text },

    stepper: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: Spacing.lg,
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        borderRadius: Radius.full,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: Colors.border,
    },
    stepperButton: {
        width: 28,
        height: 28,
        borderRadius: Radius.full,
        backgroundColor: Colors.surfaceMuted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepperValue: { ...Typography.labelBold, color: Colors.text, minWidth: 16, textAlign: 'center' },

    detailsBlock: { gap: Spacing.sm },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
    detailValue: { ...Typography.bodySm, color: Colors.text },

    // More from seller
    relatedRow: { gap: Spacing.md, paddingRight: Spacing.lg },
    relatedCard: { width: 130 },
    relatedImage: {
        width: 130,
        height: 130,
        borderRadius: Radius.md,
        backgroundColor: Colors.surfaceMuted,
        marginBottom: Spacing.xs,
    },
    relatedTitle: { ...Typography.bodySm, color: Colors.text },
    relatedPrice: { ...Typography.labelBold, color: Colors.text },

    // Sticky footer
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
        gap: Spacing.md,
        backgroundColor: Colors.background,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderColor: Colors.border,
        // A soft lift so the bar reads as floating above the page rather than
        // being the end of it. Android needs elevation, iOS needs the shadow.
        elevation: 12,
        shadowColor: Colors.black,
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: -4 },
    },
    footerTop: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
    },
    footerTotal: { ...Typography.displayLg, fontSize: 22, color: Colors.text },

    // Side by side, not stacked: two full-width buttons on top of each other
    // make the bar tall and give equal weight to unequal actions.
    footerButtons: { flexDirection: 'row', gap: Spacing.sm },
    cartButton: {
        flex: 1,
        flexDirection: 'row',
        gap: Spacing.xs,
        paddingVertical: Spacing.md,
        borderRadius: Radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    cartText: { ...Typography.labelBold, fontSize: 15, color: Colors.text },
    buyButton: {
        // 1.4 vs 1: the primary action gets more room without a second colour
        // doing all the work.
        flex: 1.4,
        paddingVertical: Spacing.md,
        borderRadius: Radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary,
    },
    buyText: { ...Typography.labelBold, fontSize: 15, color: Colors.onPrimary },
});
