import { Ionicons } from "@expo/vector-icons";
import { CameraType, CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import { useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { goBack } from "@/app/navigation/nav";
import { Strings } from "@/constants/strings";
import { Colors, Radius, Spacing, Typography } from "@/constants/theme";

type Props = {
    /** Called with a local file URI once we have a photo — captured OR picked. */
    onPhoto: (uri: string) => void;
};

/**
 * The live camera. Three things only: flip, shutter, gallery.
 *
 * Both the shutter and the gallery button end in the same place — `onPhoto(uri)`.
 * That is why the preview screen never has to know where a photo came from.
 */
export default function CameraScreen({ onPhoto }: Props) {
    const [facing, setFacing] = useState<CameraType>("back");
    const [isCapturing, setIsCapturing] = useState(false);
    const cameraRef = useRef<CameraView>(null);

    // Two separate permissions: one to SEE through the camera, one to WRITE the
    // photo into the device gallery. `writeOnly` keeps the second prompt narrow —
    // we never read the user's library, so we should never ask to.
    const [cameraPermission, requestCameraPermission] = useCameraPermissions();
    const [libraryPermission, requestLibraryPermission] = MediaLibrary.usePermissions({
        writeOnly: true,
        granularPermissions: ["photo"],
    });

    // `null` means "still figuring it out". Render nothing rather than briefly
    // flashing the permission prompt at a user who already granted access.
    if (!cameraPermission) {
        return <View style={styles.container} />;
    }

    if (!cameraPermission.granted) {
        return (
            <SafeAreaView style={styles.container}>
                <CloseButton />
                <View style={styles.permissionBox}>
                    <Ionicons name="camera-outline" size={48} color={Colors.white} />
                    <Text style={styles.permissionTitle}>{Strings.camera.permissionTitle}</Text>
                    <Text style={styles.permissionBody}>{Strings.camera.permissionBody}</Text>
                    <Pressable style={styles.permissionButton} onPress={requestCameraPermission}>
                        <Text style={styles.permissionButtonText}>{Strings.camera.grantAccess}</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    const flipCamera = () => setFacing((current) => (current === "back" ? "front" : "back"));

    const takePicture = async () => {
        // Guard against a double-tap firing two captures.
        if (!cameraRef.current || isCapturing) return;
        setIsCapturing(true);

        try {
            const photo = await cameraRef.current.takePictureAsync();
            if (!photo) return;

            // `takePictureAsync` only writes to the app's cache directory, which the
            // OS may clear at any time. Copying it into the media library is what
            // actually puts it in the phone's Gallery / Photos app.
            //
            // A failed save must NOT lose the photo — we still hand the cache URI to
            // the preview screen so the user can post it.
            try {
                const granted =
                    libraryPermission?.granted || (await requestLibraryPermission()).granted;
                if (granted) {
                    await MediaLibrary.Asset.create(photo.uri);
                }
            } catch {
                Alert.alert(Strings.camera.saveFailed);
            }

            onPhoto(photo.uri);
        } catch {
            Alert.alert(Strings.camera.captureFailed);
        } finally {
            setIsCapturing(false);
        }
    };

    const openGallery = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ["images"],
                quality: 1,
            });
            // Backing out of the picker is a normal action, not an error.
            if (result.canceled) return;
            onPhoto(result.assets[0].uri);
        } catch {
            Alert.alert(Strings.camera.galleryFailed);
        }
    };

    return (
        <View style={styles.container}>
            <CameraView ref={cameraRef} style={styles.preview} facing={facing} />

            <SafeAreaView style={styles.overlay} edges={["top", "bottom"]} pointerEvents="box-none">
                <CloseButton />

                <View style={styles.controls}>
                    <Pressable style={styles.sideButton} onPress={openGallery} hitSlop={12}>
                        <Ionicons name="images-outline" size={28} color={Colors.white} />
                    </Pressable>

                    {/* The shutter dims while a capture is in flight, so a slow save
                        still feels like it acknowledged the tap. */}
                    <Pressable
                        style={[styles.shutter, isCapturing && styles.shutterDisabled]}
                        onPress={takePicture}
                        disabled={isCapturing}
                    >
                        <View style={styles.shutterInner} />
                    </Pressable>

                    <Pressable style={styles.sideButton} onPress={flipCamera} hitSlop={12}>
                        <Ionicons name="camera-reverse-outline" size={30} color={Colors.white} />
                    </Pressable>
                </View>
            </SafeAreaView>
        </View>
    );
}

/** Top-left "✕" that dismisses the whole camera route. */
function CloseButton() {
    return (
        <Pressable style={styles.closeButton} onPress={goBack} hitSlop={12}>
            <Ionicons name="close" size={30} color={Colors.white} />
        </Pressable>
    );
}

const styles = StyleSheet.create({
    // The camera sits on black, not on the app's white background — a white gap
    // around the preview on tall screens looks broken.
    container: {
        flex: 1,
        backgroundColor: Colors.black,
    },
    preview: {
        flex: 1,
    },
    // Floats above the preview. `box-none` lets taps fall through the empty middle
    // to the camera while the buttons themselves stay tappable.
    overlay: {
        ...StyleSheet.absoluteFill,
        justifyContent: "space-between",
    },
    closeButton: {
        alignSelf: "flex-start",
        padding: Spacing.lg,
    },
    controls: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: Spacing.xl,
        paddingBottom: Spacing.xl,
    },
    sideButton: {
        width: 56,
        height: 56,
        alignItems: "center",
        justifyContent: "center",
    },
    // The classic ring-around-a-disc shutter.
    shutter: {
        width: 76,
        height: 76,
        borderRadius: Radius.full,
        borderWidth: 4,
        borderColor: Colors.white,
        alignItems: "center",
        justifyContent: "center",
    },
    shutterDisabled: {
        opacity: 0.5,
    },
    shutterInner: {
        width: 60,
        height: 60,
        borderRadius: Radius.full,
        backgroundColor: Colors.white,
    },
    permissionBox: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: Spacing.xl,
        gap: Spacing.md,
    },
    permissionTitle: {
        ...Typography.headlineMd,
        color: Colors.white,
    },
    permissionBody: {
        ...Typography.bodySm,
        color: Colors.border,
        textAlign: "center",
    },
    permissionButton: {
        marginTop: Spacing.sm,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xl,
        borderRadius: Radius.full,
        backgroundColor: Colors.primary,
    },
    permissionButtonText: {
        ...Typography.labelBold,
        color: Colors.onPrimary,
    },
});
