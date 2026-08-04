import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams } from "expo-router";

import CameraScreen from "@/components/camera/CameraScreen";
import PhotoPreview from "@/components/camera/PhotoPreview";
import { replaceWithParams, Routes } from "@/app/navigation/nav";

/**
 * One route, two states — no second screen needed.
 *
 *   photoUri === null  → the live camera
 *   photoUri !== null  → that photo, with a Post button
 *
 * "Retake" is just clearing the state, and both the shutter and the gallery
 * picker set it, so they converge on the same preview.
 */
export default function CameraRoute() {
    const [photoUri, setPhotoUri] = useState<string | null>(null);

    // Where the photo should go when the user taps Post. The Product tab opens the
    // camera with ?returnTo=/create/product-tab; the header camera icon passes
    // nothing, so the Post tab stays the default.
    const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
    const destination = returnTo ?? Routes.CREATE_POST;

    // Hand the photo to the create form, which reads it with useLocalSearchParams().
    // `replace`, not `navigate`: once the photo is posted, pressing back should go
    // to wherever you opened the camera from — not back into the camera.
    const postPhoto = () => replaceWithParams(destination, { photoUri });

    return (
        <>
            {/* Both states draw on black, so the OS clock and battery need to be white. */}
            <StatusBar style="light" />
            {photoUri === null ? (
                <CameraScreen onPhoto={setPhotoUri} />
            ) : (
                <PhotoPreview
                    uri={photoUri}
                    onRetake={() => setPhotoUri(null)}
                    onPost={postPhoto}
                />
            )}
        </>
    );
}
