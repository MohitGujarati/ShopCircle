import { useLocalSearchParams } from "expo-router";

import ProductDetail from "@/components/product/ProductDetail";

// [id].tsx is a DYNAMIC route: the square brackets mean "match anything here",
// so /product/abc-123 lands on this file with id = "abc-123".
export default function ProductScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();

    return <ProductDetail id={id} />;
}
