import { navigateWithParams, replace, Routes } from '@/app/navigation/nav';
import PhotoPicker from '@/components/create/PhotoPicker';
import { Strings } from '@/constants/strings';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { uploadImages } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    ToastAndroid,
    TouchableOpacity,
    View,
} from 'react-native';

type Props = {
    /** Local file URI of a photo carried over from the camera screen. */
    photoUri?: string;
};

// --- REUSABLE PIECES -------------------------------------------------------

/**
 * One labelled input. Every field on this form looks the same, so the label +
 * spacing + border live here once instead of being repeated six times.
 *
 * `...inputProps` forwards anything a TextInput accepts (keyboardType,
 * multiline, maxLength…) without this component having to know about them —
 * the same pattern AuthField already uses in auth/parts.tsx.
 */
const Field = ({
    label,
    required = false,
    children,
}: {
    label: string;
    required?: boolean;
    children: React.ReactNode;
}) => (
    <View style={styles.field}>
        <Text style={styles.fieldLabel}>
            {label}
            {required ? <Text style={styles.requiredMark}> {Strings.create.required}</Text> : null}
        </Text>
        {children}
    </View>
);

/**
 * A row of single-select chips (Category, Condition). Kept generic — it takes
 * the options and reports which one was tapped, so it knows nothing about what
 * it's selecting.
 */
const ChipRow = ({
    options,
    value,
    onChange,
}: {
    options: readonly string[];
    value: string;
    onChange: (next: string) => void;
}) => (
    <View style={styles.chipRow}>
        {options.map((option) => {
            const isActive = option === value;
            return (
                <TouchableOpacity
                    key={option}
                    style={[styles.chip, isActive && styles.chipActive]}
                    onPress={() => onChange(option)}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{option}</Text>
                </TouchableOpacity>
            );
        })}
    </View>
);

const CATEGORIES = Object.values(Strings.create.categories);
const CONDITIONS = Object.values(Strings.create.conditions);

// --- SCREEN ----------------------------------------------------------------

const ProductAdd = ({ photoUri }: Props) => {
    const { user } = useAuth();
    const [title, setTitle] = useState('');
    const [price, setPrice] = useState('');
    const [category, setCategory] = useState<string>(CATEGORIES[0]);
    const [condition, setCondition] = useState<string>(CONDITIONS[0]);
    const [location, setLocation] = useState('');
    const [description, setDescription] = useState('');
    // Disables the button and shows a spinner while the upload + insert are in
    // flight, so one fast double tap can't create two products.
    const [saving, setSaving] = useState(false);

    // The photos to publish. Seeded from the camera's route param, then grown by
    // the gallery picker.
    const [photos, setPhotos] = useState<string[]>(photoUri ? [photoUri] : []);

    // Returning from the camera re-renders this screen with a new photoUri while
    // it stays mounted; the ref remembers which param we already consumed so each
    // photo is appended exactly once.
    const lastParam = useRef(photoUri);
    useEffect(() => {
        if (photoUri && photoUri !== lastParam.current) {
            lastParam.current = photoUri;
            setPhotos((prev) => (prev.includes(photoUri) ? prev : [...prev, photoUri]));
        }
    }, [photoUri]);

    // Tell the camera to come BACK here. Without the returnTo param it always
    // replaces itself with the Post tab, so a product photo would land on the
    // wrong form.
    const openCamera = () =>
        navigateWithParams(Routes.CAMERA, { returnTo: Routes.CREATE_PRODUCT });

    // A product is publishable once it has a photo, a name and a price. The
    // button reflects this instead of letting you tap it and then explaining
    // what's missing in an alert.
    const canPublish =
        !saving && photos.length > 0 && title.trim().length > 0 && price.trim().length > 0;

    const handlePublish = async () => {
        if (saving) return;
        if (!user) {
            Alert.alert('Not signed in', 'Please log in before publishing a product.');
            return;
        }
        if (photos.length === 0) return;

        // `price` is a string from the keyboard; the column is numeric(10,2).
        // Postgres would reject "" or "12.3.4" with `invalid input syntax for
        // type numeric`, so we catch it here where we can say something useful.
        const priceValue = Number(price);
        if (!Number.isFinite(priceValue) || priceValue < 0) {
            Alert.alert('Check the price', 'Enter a price like 499 or 499.50.');
            return;
        }

        setSaving(true);
        try {
            // Upload first: a failed upload means no row, so we can never have a
            // product pointing at an image that doesn't exist.
            const imageUrls = await uploadImages(photos, 'products', user.id);

            // user_id is NOT sent — the column defaults to auth.uid() and the RLS
            // insert policy verifies it, so you can't publish as someone else.
            const { error } = await supabase.from('products').insert({
                // images[] holds them all; image_url keeps the cover photo.
                images: imageUrls,
                image_url: imageUrls[0],
                title: title.trim(),
                price: priceValue,
                category,
                condition,
                // Empty optional text is stored as NULL, not "". One representation
                // of "no value" is easier to query than two.
                location: location.trim() || null,
                description: description.trim() || null,
            });
            if (error) throw error;

            setTitle('');
            setPrice('');
            setLocation('');
            setDescription('');
            setPhotos([]);
            setCategory(CATEGORIES[0]);
            setCondition(CONDITIONS[0]);

            replace(Routes.HOME);

            if (Platform.OS === 'android') {
                ToastAndroid.show('Your product is live.', ToastAndroid.LONG);
            } else if (Platform.OS === 'web') {
                alert('Your product is live.');
            }
        } catch (e) {
            Alert.alert("Couldn't publish", e instanceof Error ? e.message : String(e));
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
                {/* COVER PHOTO — the first one is what the feed and grid show. */}
                <TouchableOpacity
                    style={styles.photoWrapper}
                    onPress={openCamera}
                    activeOpacity={0.8}
                    // Nothing to open once there are photos; the strip below adds more.
                    disabled={photos.length > 0}
                >
                    {photos.length > 0 ? (
                        <Image source={{ uri: photos[0] }} style={styles.photo} contentFit="cover" />
                    ) : (
                        <View style={[styles.photo, styles.photoPlaceholder]}>
                            <Ionicons name="camera-outline" size={28} color={Colors.textSecondary} />
                            <Text style={styles.photoPlaceholderText}>
                                {Strings.create.addProductPhoto}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>

                <PhotoPicker photos={photos} onChange={setPhotos} onOpenCamera={openCamera} />

                {/* NAME */}
                <Field label={Strings.create.productName} required>
                    <TextInput
                        style={styles.input}
                        placeholder={Strings.create.productNamePlaceholder}
                        placeholderTextColor={Colors.textSecondary}
                        value={title}
                        onChangeText={setTitle}
                        maxLength={80}
                    />
                </Field>

                {/* PRICE — the ₹ sits outside the TextInput so the user never has to
                    type or delete it, and the value stays a clean number string. */}
                <Field label={Strings.create.price} required>
                    <View style={styles.priceRow}>
                        <Text style={styles.currency}>₹</Text>
                        <TextInput
                            style={[styles.input, styles.priceInput]}
                            placeholder={Strings.create.pricePlaceholder}
                            placeholderTextColor={Colors.textSecondary}
                            value={price}
                            onChangeText={setPrice}
                            // decimal-pad shows a number keypad with a "." and no
                            // minus sign — the right keyboard for money.
                            keyboardType="decimal-pad"
                        />
                    </View>
                </Field>

                {/* CATEGORY */}
                <Field label={Strings.create.category}>
                    <ChipRow options={CATEGORIES} value={category} onChange={setCategory} />
                </Field>

                {/* CONDITION */}
                <Field label={Strings.create.condition}>
                    <ChipRow options={CONDITIONS} value={condition} onChange={setCondition} />
                </Field>

                {/* LOCATION */}
                <Field label={Strings.create.location}>
                    <View style={styles.iconInputRow}>
                        <Ionicons
                            name="location-outline"
                            size={18}
                            color={Colors.textSecondary}
                            style={styles.inputIcon}
                        />
                        <TextInput
                            style={[styles.input, styles.iconInput]}
                            placeholder={Strings.create.locationPlaceholder}
                            placeholderTextColor={Colors.textSecondary}
                            value={location}
                            onChangeText={setLocation}
                        />
                    </View>
                </Field>

                {/* DESCRIPTION */}
                <Field label={Strings.create.description}>
                    <TextInput
                        style={[styles.input, styles.textarea]}
                        placeholder={Strings.create.descriptionPlaceholder}
                        placeholderTextColor={Colors.textSecondary}
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        maxLength={500}
                        // Without this, Android centres the first line vertically
                        // in a multiline box.
                        textAlignVertical="top"
                    />
                    <Text style={styles.counter}>{description.length}/500</Text>
                </Field>

                <Text style={styles.requiredHint}>{Strings.create.requiredHint}</Text>

                {/* Keeps the last field clear of the fixed footer button. */}
                <View style={{ height: Spacing.xxl * 3 }} />
            </ScrollView>

            {/* FIXED PUBLISH BUTTON */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.publishButton, !canPublish && styles.publishButtonDisabled]}
                    activeOpacity={0.8}
                    disabled={!canPublish}
                    onPress={handlePublish}
                >
                    {saving ? (
                        <ActivityIndicator color={Colors.onPrimary} />
                    ) : (
                        <Text style={styles.publishText}>{Strings.create.publish}</Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

export default ProductAdd;

// --- STYLES ----------------------------------------------------------------

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollContent: {
        paddingHorizontal: Spacing.screen,
        paddingTop: Spacing.md,
    },

    // Photo
    photoWrapper: {
        alignSelf: 'center',
        width: '100%',
        maxWidth: 500,
    },
    photo: {
        width: '100%',
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
        gap: Spacing.sm,
    },
    photoPlaceholderText: {
        ...Typography.bodySm,
        color: Colors.textSecondary,
    },
    changePhoto: {
        ...Typography.labelBold,
        color: Colors.primary,
        textAlign: 'center',
        marginTop: Spacing.sm,
    },

    // Fields
    field: {
        marginTop: Spacing.xl,
    },
    fieldLabel: {
        ...Typography.labelBold,
        color: Colors.text,
        marginBottom: Spacing.sm,
    },
    requiredMark: {
        color: Colors.primary,
    },
    input: {
        ...Typography.bodyLg,
        color: Colors.text,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.md,
        backgroundColor: Colors.surface,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
    },
    textarea: {
        minHeight: 110,
        paddingTop: Spacing.md,
    },
    counter: {
        ...Typography.labelSm,
        color: Colors.textSecondary,
        alignSelf: 'flex-end',
        marginTop: Spacing.xs,
    },

    // Price
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
    },

    // Input with a leading icon (location)
    iconInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    inputIcon: {
        position: 'absolute',
        left: Spacing.md,
        // Sits above the TextInput so the icon stays tappable-through.
        zIndex: 1,
    },
    iconInput: {
        flex: 1,
        paddingLeft: Spacing.xxl + Spacing.xs,
    },

    // Chips
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    chip: {
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        borderRadius: Radius.full,
        backgroundColor: Colors.surfaceMuted,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    chipActive: {
        backgroundColor: Colors.background,
        borderColor: Colors.text,
    },
    chipText: {
        ...Typography.bodySm,
        color: Colors.textSecondary,
    },
    chipTextActive: {
        color: Colors.text,
        fontWeight: '600',
    },

    requiredHint: {
        ...Typography.labelSm,
        color: Colors.textSecondary,
        marginTop: Spacing.xl,
    },

    // Footer
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
    publishButton: {
        backgroundColor: Colors.primaryDark,
        paddingVertical: Spacing.lg,
        marginBottom: Spacing.lg,
        borderRadius: Radius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    publishButtonDisabled: {
        opacity: 0.4,
    },
    publishText: {
        ...Typography.labelBold,
        color: Colors.onPrimary,
        fontSize: 16,
    },
});
