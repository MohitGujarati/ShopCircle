import HomeFeed from "@/components/home/HomeFeed";

// Home tab, served at /home. The root index.tsx is the auth gate at /, so the
// feed needs its own URL to avoid two screens colliding on "/".
// Route files stay thin: the feed UI lives in src/components/home/.
export default function HomeScreen() {
  return <HomeFeed />;
}
