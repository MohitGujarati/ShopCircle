import { Strings } from '@/constants/strings';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
    photos: string[];
    onChange: (next: string[]) => void;
    /** Opens the camera. Each screen passes its own, because the camera needs to
     *  know which tab to return the photo to. */
    onOpenCamera: () => void;
    max?: number;
};

/**
 * The photo strip shared by the Post and Product forms: existing photos as
 * thumbnails you can remove, plus tiles to add more from the gallery or camera.
 *
 * It owns no state — the parent holds the array, so it's the parent that
 * uploads it. Same "lift state up" reasoning as ProfilePage/ProfileTabs.
 */
export default function PhotoPicker({ photos, onChange, onOpenCamera, max = 6 }: Props) {
    const remaining = max - photos.length;

    const pickFromLibrary = async () => {
        if (remaining <= 0) {
            Alert.alert(Strings.create.tooManyPhotos, `${max} photos is the limit.`);
            return;
        }

        // Android 13+ and modern iOS use a system picker that needs no
        // permission, but older versions do — ask, and stop if refused.
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert(Strings.create.libraryPermissionTitle, Strings.create.libraryPermissionBody);
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            // SDK 54+ takes an array of media types; 'images' keeps videos out.
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            // Caps the picker itself, so the user can't select 20 and lose 14.
            selectionLimit: remaining,
            // Some compression: a 4MB original is wasted on a feed image.
            quality: 0.8,
        });

        if (result.canceled) return;
        onChange([...photos, ...result.assets.map((asset) => asset.uri)].slice(0, max));
    };

    const removeAt = (index: number) => onChange(photos.filter((_, i) => i !== index));

    return (
        <View>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.strip}
            >
                {photos.map((uri, index) => (
                    // The URI can repeat if someone picks the same photo twice, so
                    // the key includes the index.
                    <View key={`${uri}-${index}`} style={styles.thumbWrapper}>
                        <Image source={{ uri }} style={styles.thumb} contentFit="cover" />

                        {index === 0 && (
                            <View style={styles.coverBadge}>
                                <Text style={styles.coverText}>{Strings.create.cover}</Text>
                            </View>
                        )}

                        <TouchableOpacity
                            style={styles.removeButton}
                            onPress={() => removeAt(index)}
                            hitSlop={6}
                        >
                            <Ionicons name="close" size={14} color={Colors.white} />
                        </TouchableOpacity>
                    </View>
                ))}

                {remaining > 0 && (
                    <>
                        <TouchableOpacity style={styles.addTile} onPress={pickFromLibrary}>
                            <Ionicons name="images-outline" size={22} color={Colors.textSecondary} />
                            <Text style={styles.addText}>{Strings.create.gallery}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.addTile} onPress={onOpenCamera}>
                            <Ionicons name="camera-outline" size={22} color={Colors.textSecondary} />
                            <Text style={styles.addText}>{Strings.create.camera}</Text>
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>

            <Text style={styles.hint}>
                {photos.length}/{max} · {Strings.create.firstPhotoIsCover}
            </Text>
        </View>
    );
}

const TILE = 96;

const styles = StyleSheet.create({
    strip: {
        gap: Spacing.sm,
        paddingVertical: Spacing.sm,
    },
    thumbWrapper: {
        width: TILE,
        height: TILE,
    },
    thumb: {
        width: '100%',
        height: '100%',
        borderRadius: Radius.md,
        backgroundColor: Colors.surfaceMuted,
    },
    removeButton: {
        position: 'absolute',
        top: -4,
        right: -4,
        width: 22,
        height: 22,
        borderRadius: Radius.full,
        backgroundColor: Colors.black,
        alignItems: 'center',
        justifyContent: 'center',
    },
    coverBadge: {
        position: 'absolute',
        left: Spacing.xs,
        bottom: Spacing.xs,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 1,
        borderRadius: Radius.sm,
    },
    coverText: {
        ...Typography.labelSm,
        color: Colors.white,
    },
    addTile: {
        width: TILE,
        height: TILE,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: Colors.border,
        backgroundColor: Colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xs,
    },
    addText: {
        ...Typography.labelSm,
        color: Colors.textSecondary,
    },
    hint: {
        ...Typography.labelSm,
        color: Colors.textSecondary,
    },
});
