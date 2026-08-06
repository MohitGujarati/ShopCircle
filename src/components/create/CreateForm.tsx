import { navigateWithParams, replace, Routes } from '@/app/navigation/nav';
import PhotoPicker from '@/components/create/PhotoPicker';
import {
    ActionChip,
    ChipRow,
    Divider,
    Field,
    LabeledInput,
    MenuItem,
} from '@/components/create/parts';
import { Strings } from '@/constants/strings';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { uploadImages } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    ToastAndroid,
    TouchableOpacity,
    View,
} from 'react-native';

type Props = {
    /** Local file URI of a photo carried over from the camera screen. */
    photoUri?: string;
    /** Open with the product fields already showing. */
    initialSelling?: boolean;
};

const CATEGORIES = Object.values(Strings.create.categories);
const CONDITIONS = Object.values(Strings.create.conditions);

const MAX_TEXT = 500;

// Placeholder audio, so the row shows what it will eventually look like.
const AUDIO_TRACKS = [
    {
        cover: 'https://i.scdn.co/image/ab67616d0000b273b33bd95d03a116f1c4e7ed9e',
        label: 'Bayaan, Sherazam • Safar',
    },
    {
        cover: 'https://i.scdn.co/image/ab67616d0000b27376c66952e505291b920d0f7a',
        label: "Sungha Jung • I Ain't Worri…",
    },
];

/**
 * ONE create screen for both kinds of thing.
 *
 * A post and a product were two nearly identical forms — same photos, same
 * text box, same share button — differing only in the commerce fields. So this
 * is the post form, and the "Sell this item" toggle reveals the selling half.
 * The table it writes to is the only real fork, and it happens once, at submit.
 */
export default function CreateForm({ photoUri, initialSelling = false }: Props) {
    const { user } = useAuth();

    const [photos, setPhotos] = useState<string[]>(photoUri ? [photoUri] : []);
    const [caption, setCaption] = useState('');
    const [selling, setSelling] = useState(initialSelling);
    const [isAiLabelEnabled, setIsAiLabelEnabled] = useState(false);

    // Product-only fields. They keep their values when the toggle is off, so
    // flipping it back and forth doesn't wipe what you typed.
    const [title, setTitle] = useState('');
    const [price, setPrice] = useState('');
    const [category, setCategory] = useState<string>(CATEGORIES[0]);
    const [condition, setCondition] = useState<string>(CONDITIONS[0]);
    const [location, setLocation] = useState('');

    const [saving, setSaving] = useState(false);

    // Returning from the camera re-renders this screen with a new photoUri while
    // it stays mounted; the ref remembers which param we already consumed so
    // each photo is appended exactly once.
    const lastParam = useRef(photoUri);
    useEffect(() => {
        if (photoUri && photoUri !== lastParam.current) {
            lastParam.current = photoUri;
            setPhotos((prev) => (prev.includes(photoUri) ? prev : [...prev, photoUri]));
        }
    }, [photoUri]);

    const openCamera = () => navigateWithParams(Routes.CAMERA, { returnTo: Routes.CREATE });

    // A post needs a photo. A product also needs a name and a price. The button
    // reflects this instead of letting you tap it and then explaining.
    const canSubmit =
        !saving &&
        photos.length > 0 &&
        (!selling || (title.trim().length > 0 && price.trim().length > 0));

    const handleSubmit = async () => {
        if (saving) return;
        if (!user) {
            Alert.alert('Not signed in', 'Please log in before sharing.');
            return;
        }
        if (photos.length === 0) {
            Alert.alert('Add a photo', 'Pick or take a photo first.');
            return;
        }

        // `price` is a string from the keyboard; the column is numeric(10,2), and
        // Postgres would reject "" or "12.3.4" with an unhelpful error.
        const priceValue = Number(price);
        if (selling && (!Number.isFinite(priceValue) || priceValue < 0)) {
            Alert.alert('Check the price', 'Enter a price like 499 or 499.50.');
            return;
        }

        setSaving(true);
        try {
            // Upload first: a failed upload means no row, so nothing can point at
            // an image that doesn't exist. The folder must match the storage RLS
            // policy in supabase/storage.sql.
            const imageUrls = await uploadImages(photos, selling ? 'products' : 'posts', user.id);

            // The one real fork in this screen. user_id is never sent — the
            // column defaults to auth.uid() and RLS verifies it.
            const { error } = selling
                ? await supabase.from('products').insert({
                      images: imageUrls,
                      image_url: imageUrls[0],
                      title: title.trim(),
                      price: priceValue,
                      category,
                      condition,
                      // Empty optional text is stored as NULL, not "".
                      location: location.trim() || null,
                      description: caption.trim() || null,
                  })
                : await supabase.from('posts').insert({
                      images: imageUrls,
                      image_url: imageUrls[0],
                      caption: caption.trim(),
                      ai_label: isAiLabelEnabled,
                      // audience is hardcoded — the Audience row isn't wired yet.
                      audience: 'followers',
                  });

            if (error) throw error;

            setPhotos([]);
            setCaption('');
            setTitle('');
            setPrice('');
            setLocation('');
            setSelling(false);
            setIsAiLabelEnabled(false);
            setCategory(CATEGORIES[0]);
            setCondition(CONDITIONS[0]);

            replace(Routes.HOME);

            const message = selling ? 'Your product is live.' : 'Your post is live.';
            if (Platform.OS === 'android') {
                ToastAndroid.show(message, ToastAndroid.LONG);
            } else if (Platform.OS === 'web') {
                alert(message);
            }
        } catch (e) {
            Alert.alert("Couldn't share", e instanceof Error ? e.message : String(e));
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                {/* COVER PREVIEW — the first photo is what the feed shows. */}
                {photos.length > 0 ? (
                    <Image source={{ uri: photos[0] }} style={styles.photo} contentFit="cover" />
                ) : (
                    <TouchableOpacity
                        style={[styles.photo, styles.photoPlaceholder]}
                        onPress={openCamera}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.hint}>{Strings.create.addPhoto}</Text>
                    </TouchableOpacity>
                )}

                <PhotoPicker photos={photos} onChange={setPhotos} onOpenCamera={openCamera} />

                {/* TEXT — a product's description writes to the same box. */}
                <LabeledInput
                    label={selling ? Strings.create.description : Strings.create.caption}
                    placeholder={
                        selling
                            ? Strings.create.descriptionPlaceholder
                            : Strings.create.captionPlaceholder
                    }
                    value={caption}
                    onChangeText={setCaption}
                    multiline
                    maxLength={MAX_TEXT}
                    counterMax={MAX_TEXT}
                    style={styles.textarea}
                    // Without this, Android centres the first line vertically.
                    textAlignVertical="top"
                />

                {/* THE TOGGLE — everything below it depends on which side you're on. */}
                <View style={styles.sellRow}>
                    <View style={styles.sellText}>
                        <Text style={styles.sellTitle}>{Strings.create.sell}</Text>
                        <Text style={styles.hint}>{Strings.create.sellHint}</Text>
                    </View>
                    <Switch
                        value={selling}
                        onValueChange={setSelling}
                        trackColor={{ false: Colors.border, true: Colors.primary }}
                        thumbColor={Colors.white}
                    />
                </View>

                {/* ---------------- PRODUCT (only when selling) ---------------- */}
                {selling && (
                    <View style={styles.sellingBlock}>
                        <LabeledInput
                            label={Strings.create.productName}
                            required
                            placeholder={Strings.create.productNamePlaceholder}
                            value={title}
                            onChangeText={setTitle}
                            maxLength={80}
                        />

                        {/* The ₹ sits outside the input, so the user never types or
                            deletes it and `price` stays a clean number string. */}
                        <Field label={Strings.create.price} required>
                            <View style={styles.priceRow}>
                                <Text style={styles.currency}>₹</Text>
                                <TextInput
                                    style={styles.priceInput}
                                    placeholder={Strings.create.pricePlaceholder}
                                    placeholderTextColor={Colors.textSecondary}
                                    value={price}
                                    onChangeText={setPrice}
                                    // A number pad with a "." and no minus sign.
                                    keyboardType="decimal-pad"
                                />
                            </View>
                        </Field>

                        <Field label={Strings.create.category}>
                            <ChipRow options={CATEGORIES} value={category} onChange={setCategory} />
                        </Field>

                        <Field label={Strings.create.condition}>
                            <ChipRow options={CONDITIONS} value={condition} onChange={setCondition} />
                        </Field>

                        <LabeledInput
                            label={Strings.create.location}
                            icon="location-outline"
                            placeholder={Strings.create.locationPlaceholder}
                            value={location}
                            onChangeText={setLocation}
                        />

                        <Text style={[styles.hint, { marginTop: Spacing.lg }]}>
                            {Strings.create.requiredHint}
                        </Text>
                    </View>
                )}

                {/* ---------------- EXTRAS (always shown) ----------------
                    These stay visible whether you're posting or selling — a
                    listing can want a song, a tagged friend or a location just
                    as much as a post can. Everything here except the AI label
                    is UI only for now: the row exists so the screen looks
                    finished, and each one is a feature waiting to be built. */}
                <View style={styles.postBlock}>
                        <View style={styles.actionRow}>
                            <ActionChip icon="list" label={Strings.create.poll} />
                            <ActionChip icon="chatbubble-outline" label={Strings.create.prompt} />
                        </View>

                        <Divider />
                        <MenuItem iconName="musical-notes-outline" title={Strings.create.addAudio} />
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.audioScroll}
                        >
                            {AUDIO_TRACKS.map((track) => (
                                <ActionChip
                                    key={track.label}
                                    leftImage={track.cover}
                                    label={track.label}
                                />
                            ))}
                        </ScrollView>

                        <Divider />
                        <MenuItem iconName="person-outline" title={Strings.create.tagPeople} />

                        <Divider />
                        <MenuItem
                            iconName="location-outline"
                            title={Strings.create.addLocation}
                            subtitle={Strings.create.addLocationHint}
                        />

                        <Divider />
                        <MenuItem
                            iconName="sparkles-outline"
                            title={Strings.create.aiLabel}
                            subtitle={Strings.create.aiLabelHint}
                            hideArrow
                            rightElement={
                                <Switch
                                    value={isAiLabelEnabled}
                                    onValueChange={setIsAiLabelEnabled}
                                    trackColor={{ false: Colors.border, true: Colors.primary }}
                                    thumbColor={Colors.white}
                                />
                            }
                        />

                        <Divider />
                        <MenuItem
                            iconName="eye-outline"
                            title={Strings.create.audience}
                            rightText={Strings.create.followers}
                        />

                        <Divider />
                        <MenuItem
                            iconName="share-outline"
                            title={Strings.create.alsoShareOn}
                            rightText={Strings.create.off}
                            rightBadge={Strings.create.badgeNew}
                        />

                        <Divider />
                        <MenuItem
                            iconName="ellipsis-horizontal"
                            title={Strings.create.moreOptions}
                        />
                </View>

                {/* Keeps the last row clear of the fixed footer button. */}
                <View style={{ height: Spacing.xxl * 3 }} />
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
                    activeOpacity={0.8}
                    disabled={!canSubmit}
                    onPress={handleSubmit}
                >
                    {saving ? (
                        <ActivityIndicator color={Colors.onPrimary} />
                    ) : (
                        <Text style={styles.submitText}>
                            {selling ? Strings.create.publish : Strings.create.share}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollContent: {
        paddingHorizontal: Spacing.screen,
        paddingTop: Spacing.md,
    },

    photo: {
        width: '100%',
        maxWidth: 500,
        alignSelf: 'center',
        aspectRatio: 1,
        borderRadius: Radius.md,
        backgroundColor: Colors.surfaceMuted,
    },
    photoPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: Colors.border,
        backgroundColor: Colors.surface,
    },

    hint: {
        ...Typography.labelSm,
        color: Colors.textSecondary,
    },
    textarea: {
        minHeight: 90,
        paddingTop: Spacing.md,
    },

    // The toggle that splits the form in two, boxed so it reads as a decision
    // rather than just another field.
    sellRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.lg,
        marginTop: Spacing.xl,
        padding: Spacing.lg,
        borderRadius: Radius.md,
        backgroundColor: Colors.surface,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: Colors.border,
    },
    sellText: {
        flex: 1,
    },
    sellTitle: {
        ...Typography.labelBold,
        color: Colors.text,
        marginBottom: 2,
    },
    // Indented so it reads as belonging to the toggle above it.
    sellingBlock: {
        paddingLeft: Spacing.md,
        borderLeftWidth: 2,
        borderLeftColor: Colors.surfaceMuted,
    },
    postBlock: {
        marginTop: Spacing.lg,
    },
    actionRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    audioScroll: {
        gap: Spacing.sm,
        paddingBottom: Spacing.md,
    },

    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    currency: {
        ...Typography.bodyLg,
        color: Colors.text,
        marginRight: Spacing.sm,
    },
    priceInput: {
        flex: 1,
        ...Typography.bodyLg,
        color: Colors.text,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.md,
        backgroundColor: Colors.surface,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
    },

    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: Colors.background,
        paddingHorizontal: Spacing.screen,
        paddingVertical: Spacing.md,
        borderTopWidth: 1,
        borderColor: Colors.border,
    },
    submitButton: {
        backgroundColor: Colors.primaryDark,
        paddingVertical: Spacing.lg,
        marginBottom: Spacing.lg,
        borderRadius: Radius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitButtonDisabled: {
        opacity: 0.4,
    },
    submitText: {
        ...Typography.labelBold,
        color: Colors.onPrimary,
        fontSize: 16,
    },
});
