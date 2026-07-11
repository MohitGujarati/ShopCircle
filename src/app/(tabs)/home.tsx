import { ScreenPlaceholder } from "@/components/screen-placeholder";
import { Strings } from "@/constants/strings";

// Home tab, served at /home. The root index.tsx is the auth gate at /, so the
// feed needs its own URL to avoid two screens colliding on "/". Becomes the
// product feed in Phase 3.
export default function HomeScreen() {
  return (
    <ScreenPlaceholder
      icon="home"
      title={Strings.tabs.home}
      subtitle="Your product feed will live here (Phase 3)."
    />
  );
}
