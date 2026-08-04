import { useLocalSearchParams } from "expo-router";

import ProductAdd from "@/components/create/ProductAdd";

// Route files stay thin: they only say *which* component this route renders.
export default function CreateProductScreen() {
    // Same contract as post-tab: the camera screen can hand a photo over as a
    // route param. Absent when you open this tab directly, so it's optional.
    const { photoUri } = useLocalSearchParams<{ photoUri?: string }>();

    return <ProductAdd photoUri={photoUri} />;
}
