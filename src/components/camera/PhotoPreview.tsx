import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Strings } from "@/constants/strings";
import { Colors, Radius, Spacing, Typography } from "@/constants/theme";

type Props = {
    /** Local file URI of the photo — captured or picked, we don't care which. */
    uri: string;
    /** Back out to the live camera. */
    onRetake: () => void;
    /** Carry this photo into the create-post form. */
    onPost: () => void;
};

/**
 * The photo, full-screen, with one way forward (Post) and one way back (Retake).
 */
export default function PhotoPreview({ uri, onRetake, onPost }: Props) {
    return (
        <View style={styles.container}>
            {/* `contain` never crops. A portrait photo letterboxes against the black
                background instead of having its edges silently cut off. */}
            <Image source={{ uri }} style={styles.photo} contentFit="contain" />

            <SafeAreaView style={styles.overlay} edges={["top", "bottom"]} pointerEvents="box-none">
                <Pressable style={styles.backButton} onPress={onRetake} hitSlop={12}>
                    <Ionicons name="chevron-back" size={30} color={Colors.white} />
                </Pressable>

                <View style={styles.footer}>
                    <Pressable style={styles.postButton} onPress={onPost}>
                        <Text style={styles.postButtonText}>{Strings.camera.post}</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.black,
    },
    photo: {
        flex: 1,
    },
    overlay: {
        ...StyleSheet.absoluteFill,
        justifyContent: "space-between",
    },
    backButton: {
        alignSelf: "flex-start",
        padding: Spacing.lg,
    },
    // Post sits bottom-right, where the thumb already is after a capture.
    footer: {
        flexDirection: "row",
        justifyContent: "flex-end",
        paddingHorizontal: Spacing.xl,
        paddingBottom: Spacing.xl,
    },
    postButton: {
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xl,
        borderRadius: Radius.full,
        backgroundColor: Colors.primary,
    },
    postButtonText: {
        ...Typography.labelBold,
        fontSize: 16,
        color: Colors.onPrimary,
    },
});
