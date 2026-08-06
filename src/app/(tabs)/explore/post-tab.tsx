import ExploreGrid from "@/components/explore/ExploreGrid";

// Route files stay thin: they only say *which* component this route renders.
export default function ExplorePostsScreen() {
    return <ExploreGrid kind="post" />;
}
