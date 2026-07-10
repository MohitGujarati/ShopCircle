import { useLocalSearchParams } from "expo-router";

import PostAdd from "@/components/create/PostAdd";

// Route files stay thin: they only say *which* component this route renders.
// The real UI lives in src/components/create/ so it can be reused and tested.
export default function CreatePostScreen() {
    // Set by the camera screen's Post button. Absent when you reach this tab by
    // tapping the (+) tab directly, so treat it as optional.
    const { photoUri } = useLocalSearchParams<{ photoUri?: string }>();

    return <PostAdd photoUri={photoUri} />;
}
