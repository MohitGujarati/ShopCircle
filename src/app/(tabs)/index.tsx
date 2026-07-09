import { ScreenPlaceholder } from "@/components/screen-placeholder";
import { Strings } from "@/constants/strings";

// Home tab. File is named index.tsx so it's the group's DEFAULT route (opens
// first). Becomes the product feed in Phase 3.
export default function HomeScreen() {
  return (
    <ScreenPlaceholder
      icon="home"
      title={Strings.tabs.home}
      subtitle="Your product feed will live here (Phase 3)."
    />
  );
}
