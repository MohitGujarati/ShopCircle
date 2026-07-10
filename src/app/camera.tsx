import { useState } from "react";
import { StatusBar } from "expo-status-bar";

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

    // Hand the photo to the create form, which reads it with useLocalSearchParams().
    // `replace`, not `navigate`: once the photo is posted, pressing back should go
    // to wherever you opened the camera from — not back into the camera.
    const postPhoto = () => replaceWithParams(Routes.CREATE_POST, { photoUri });

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
