import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { goBack } from "@/app/navigation/nav";
import { Strings } from "@/constants/strings";
import { Colors, Radius, Spacing, Typography } from "@/constants/theme";

type Props = {
    /** Called with a blob/file URI once the user has chosen an image. */
    onPhoto: (uri: string) => void;
};

/**
 * The WEB version of the camera screen — a plain "upload from your computer".
 *
 * WHY THIS FILE EXISTS (and why it is `.web.tsx`)
 * Metro resolves `./CameraScreen` to this file when bundling for web, and to
 * `CameraScreen.tsx` on iOS/Android. That is not just cosmetic here:
 *
 * `expo-media-library` has NO web build. Its entry point runs
 * `class Asset extends requireNativeModule('ExpoMediaLibraryNext').Asset`, and on
 * web that native module is `undefined` — so merely *importing* it throws
 * "Class extends value undefined is not a constructor or null" before any of our
 * code runs. A `Platform.OS === 'web'` check cannot save us, because the crash is
 * in the import, not in the call.
 *
 * Splitting the file keeps `expo-media-library` (and the live camera) out of the
 * web bundle entirely. Browsers have no photo roll to save to anyway.
 */
export default function CameraScreenWeb({ onPhoto }: Props) {
    // On web, expo-image-picker renders a hidden <input type="file"> for us.
    const choosePhoto = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ["images"],
                quality: 1,
            });
            if (result.canceled) return;
            onPhoto(result.assets[0].uri);
        } catch {
            Alert.alert(Strings.camera.galleryFailed);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Pressable style={styles.closeButton} onPress={goBack} hitSlop={12}>
                <Ionicons name="close" size={30} color={Colors.white} />
            </Pressable>

            <View style={styles.content}>
                <Ionicons name="cloud-upload-outline" size={48} color={Colors.white} />
                <Text style={styles.title}>{Strings.camera.uploadTitle}</Text>
                <Text style={styles.body}>{Strings.camera.uploadBody}</Text>
                <Pressable style={styles.button} onPress={choosePhoto}>
                    <Text style={styles.buttonText}>{Strings.camera.choosePhoto}</Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    // Black, to match the native camera screen this stands in for.
    container: {
        flex: 1,
        backgroundColor: Colors.black,
    },
    closeButton: {
        alignSelf: "flex-start",
        padding: Spacing.lg,
    },
    content: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: Spacing.xl,
        gap: Spacing.md,
    },
    title: {
        ...Typography.headlineMd,
        color: Colors.white,
    },
    body: {
        ...Typography.bodySm,
        color: Colors.border,
        textAlign: "center",
    },
    button: {
        marginTop: Spacing.sm,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xl,
        borderRadius: Radius.full,
        backgroundColor: Colors.primary,
    },
    buttonText: {
        ...Typography.labelBold,
        color: Colors.onPrimary,
    },
});
