import { useLocalSearchParams } from "expo-router";

import CreateForm from "@/components/create/CreateForm";

/**
 * The Create screen. One form for posts AND products — the product fields are
 * behind a toggle inside it, so there are no top tabs any more.
 *
 * post-tab.tsx and product-tab.tsx still exist as routes and render the same
 * form; they're just not reachable from a tab bar.
 */
export default function CreateScreen() {
    // Set by the camera screen's Post button. Absent when you reach this tab by
    // tapping the (+) tab directly, so treat it as optional.
    const { photoUri } = useLocalSearchParams<{ photoUri?: string }>();

    return <CreateForm photoUri={photoUri} />;
}
