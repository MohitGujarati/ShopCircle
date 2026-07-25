import { replace, Routes } from '@/app/navigation/nav';
import { Strings } from '@/constants/strings';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useState } from 'react';
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
    TouchableOpacity, useWindowDimensions, View
} from 'react-native';

type Props = {
    /** Local file URI of a photo carried over from the camera screen. */
    photoUri?: string;
};



// --- REUSABLE COMPONENTS ---

const ActionChip = ({ icon, label, leftImage }: { icon?: keyof typeof Ionicons.glyphMap, label: string, leftImage?: string }) => (
    <TouchableOpacity style={styles.chip}>
        {leftImage ? (
            <Image source={{ uri: leftImage }} style={styles.chipImage} contentFit="cover" />
        ) : icon ? (
            <Ionicons name={icon} size={16} color={Colors.text} style={styles.chipIcon} />
        ) : null}
        <Text style={[Typography.bodySm, { color: Colors.text, fontWeight: "500" }]}>{label}</Text>
    </TouchableOpacity>
);

interface MenuItemProps {
    iconName: keyof typeof Ionicons.glyphMap | keyof typeof Feather.glyphMap;
    IconFamily?: any;
    title: string;
    subtitle?: string;
    rightText?: string;
    rightBadge?: string;
    rightElement?: React.ReactNode;
    hideArrow?: boolean;
}

const MenuItem = ({
    iconName,
    IconFamily = Ionicons,
    title,
    subtitle,
    rightText,
    rightBadge,
    rightElement,
    hideArrow = false,
}: MenuItemProps) => (
    <TouchableOpacity style={styles.menuItemContainer} activeOpacity={0.7}>
        <View style={styles.menuItemLeft}>
            <IconFamily name={iconName} size={24} color={Colors.text} style={styles.menuIcon} />
        </View>
        <View style={styles.menuItemCenter}>
            <Text style={Typography.bodyLg}>{title}</Text>
            {subtitle && <Text style={styles.subtitleText}>{subtitle}</Text>}
        </View>
        <View style={styles.menuItemRight}>
            {rightText && <Text style={styles.rightText}>{rightText}</Text>}
            {rightBadge && (
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{rightBadge}</Text>
                </View>
            )}
            {rightElement}
            {!hideArrow && !rightElement && (
                <MaterialIcons name="chevron-right" size={24} color={Colors.textSecondary} />
            )}
        </View>
    </TouchableOpacity>
);

// --- MAIN SCREEN ---

export default function PostAdd({ photoUri }: Props) {
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 768;
    const { user } = useAuth();
    const [caption, setCaption] = useState("");
    const [isAiLabelEnabled, setIsAiLabelEnabled] = useState(false);
    // Tracks the save so we can disable the button and show a spinner while the
    // network request is in flight (avoids double-posting on a fast double tap).
    const [saving, setSaving] = useState(false);

    // Insert one row into the `posts` table (see supabase/posts_products.sql).
    // We only send the fields the user filled in; the DB fills id, user_id,
    // and created_at for us via its column defaults.


    const handleShare = async () => {
        if (saving) return;

        if (!user) {
            Alert.alert("Not signed in", "Please log in before sharing a post.");
            return;
        }
        if (!photoUri) {
            Alert.alert("Add a photo", "Pick or take a photo before sharing.");
            return;
        }

        setSaving(true);
        // .insert() writes the row; RLS on the table verifies user_id === auth.uid().
        const { error } = await supabase.from("posts").insert({
            image_url: photoUri,
            caption: caption.trim(),
            ai_label: isAiLabelEnabled,
            // audience is hardcoded for now — the "Audience" menu row isn't wired up yet.
            audience: "followers",
        });
        setSaving(false);

        if (error) {
            Alert.alert("Couldn't share", error.message);
            return;
        }

        setCaption("");
        setIsAiLabelEnabled(false);
        replace(Routes.HOME);
        ToastAndroid.show("Your post is live.", ToastAndroid.LONG);

        if (Platform.OS === "web") {
            alert("Your post is live.");
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* IMAGE PREVIEW OR PLACEHOLDER */}
                <View style={styles.imageWrapper}>
                    {photoUri ? (
                        <Image source={{ uri: photoUri }} style={[
                            styles.photo,
                            {
                                width: "100%",
                                maxWidth: 500,
                                alignSelf: "center",
                            },
                        ]} contentFit="cover" />
                    ) : (
                        <View style={[
                            styles.photo,
                            {
                                width: "100%",
                                maxWidth: 500,
                                alignSelf: "center",
                            },
                        ]}      >
                            <Text style={styles.placeholderText}>{Strings.create.addPhoto}</Text>
                        </View>
                    )}
                </View>

                {/* CAPTION INPUT */}
                <TextInput
                    style={styles.captionInput}
                    placeholder="Add a caption..."
                    placeholderTextColor={Colors.textSecondary}
                    multiline
                    value={caption}
                    onChangeText={setCaption}
                />

                {/* POLL / PROMPT BUTTONS */}
                <View style={styles.actionRow}>
                    <ActionChip icon="list" label="Poll" />
                    <ActionChip icon="chatbubble-outline" label="Prompt" />
                </View>

                <View style={styles.divider} />

                {/* MENU ITEMS */}
                <MenuItem iconName="musical-notes-outline" title="Add audio" />

                {/* Audio Horizontal Scroll */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.audioScroll}>
                    <ActionChip leftImage="https://i.scdn.co/image/ab67616d0000b273b33bd95d03a116f1c4e7ed9e" label="Bayaan, Sherazam • Safar" />
                    <ActionChip leftImage="https://i.scdn.co/image/ab67616d0000b27376c66952e505291b920d0f7a" label="Sungha Jung • I Ain't Worri..." />
                </ScrollView>

                <View style={styles.divider} />
                <MenuItem iconName="person-outline" title="Tag people" />
                <View style={styles.divider} />
                <MenuItem
                    iconName="location-outline"
                    title="Add location"
                    subtitle="People you share this content with can see the location you tag and view this content on the map."
                />
                <View style={styles.divider} />

                {/* AI LABEL TOGGLE */}
                <MenuItem
                    iconName="sparkles-outline"
                    title="Add AI label"
                    subtitle="We require you to label certain realistic content that's made with AI. Learn more"
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

                <View style={styles.divider} />
                <MenuItem iconName="eye-outline" title="Audience" rightText="Followers" />
                <View style={styles.divider} />
                <MenuItem
                    iconName="share-outline"
                    title="Also share on..."
                    rightText="Off"
                    rightBadge="New"
                />
                <View style={styles.divider} />
                <MenuItem iconName="ellipsis-horizontal" title="More options" />

                {/* Bottom Spacing to ensure scroll doesn't hide behind Share button */}
                <View style={{ height: Spacing.xxl * 3 }} />
            </ScrollView>

            {/* FIXED BOTTOM SHARE BUTTON */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.shareButton, saving && styles.shareButtonDisabled]}
                    activeOpacity={0.8}
                    onPress={handleShare}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color={Colors.onPrimary} />
                    ) : (
                        <Text style={styles.shareText}>Share</Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

// --- STYLES ---

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollContent: {
        paddingBottom: Spacing.lg,
    },
    imageWrapper: {
        paddingHorizontal: Spacing.screen, // 12px from your theme
        marginTop: Spacing.md,
    },
    photo: {
        width: "100%",
        aspectRatio: 1,
        borderRadius: Radius.md,
        backgroundColor: Colors.surfaceMuted,
    },
    placeholder: {

        width: "100%",
        aspectRatio: 1,
        borderRadius: Radius.md,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: Colors.border,
        backgroundColor: Colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    placeholderText: {
        ...Typography.bodySm,
        color: Colors.textSecondary,
        textAlign: "center",
    },
    captionInput: {
        ...Typography.bodyLg,

        borderWidth: 1,
        borderRadius: Radius.md,
        borderColor: Colors.border,
        backgroundColor: Colors.surface,
        marginTop: 20,
        marginBottom: 10,
        marginLeft: 5,
        marginRight: 5,
        color: Colors.text,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.xl,
        minHeight: 80,
        textAlignVertical: 'top', // Fixes multiline alignment on Android
    },
    actionRow: {
        flexDirection: "row",
        paddingHorizontal: Spacing.screen,
        marginBottom: Spacing.md,
        gap: Spacing.sm,
    },
    chip: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.surfaceMuted,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        borderRadius: Radius.md,
    },
    chipIcon: {
        marginRight: Spacing.xs,
    },
    chipImage: {
        width: 20,
        height: 20,
        borderRadius: Radius.sm,
        marginRight: Spacing.sm,
    },
    audioScroll: {
        paddingHorizontal: Spacing.screen,
        paddingBottom: Spacing.md,
        gap: Spacing.sm,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.border,
        marginVertical: 0,
    },
    menuItemContainer: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: Spacing.screen,
        paddingVertical: Spacing.md,
    },
    menuItemLeft: {
        marginRight: Spacing.lg,
        alignSelf: "flex-start",
    },
    menuIcon: {
        marginTop: 2,
    },
    menuItemCenter: {
        flex: 1,
    },
    subtitleText: {
        ...Typography.bodySm,
        color: Colors.textSecondary,
        marginTop: Spacing.xs,
        paddingRight: Spacing.lg,
    },
    menuItemRight: {
        flexDirection: "row",
        alignItems: "center",
    },
    rightText: {
        ...Typography.bodyLg,
        color: Colors.textSecondary,
        marginRight: Spacing.xs,
    },
    badge: {
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: Radius.sm,
        marginRight: Spacing.xs,
    },
    badgeText: {
        ...Typography.labelSm,
        color: Colors.onPrimary,
    },
    footer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: Colors.background,
        paddingHorizontal: Spacing.screen,
        paddingVertical: Spacing.md,
        borderTopWidth: 1,
        borderColor: Colors.border,
    },
    shareButton: {
        backgroundColor: Colors.primaryDark,
        paddingVertical: Spacing.lg,
        marginBottom: Spacing.lg,
        borderRadius: Radius.full,
        alignItems: "center",
        justifyContent: "center",
    },
    shareButtonDisabled: {
        opacity: 0.6,
    },
    shareText: {
        ...Typography.labelBold,
        color: Colors.onPrimary,
        fontSize: 16,
    },
});