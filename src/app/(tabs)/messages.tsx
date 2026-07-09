import { ScreenPlaceholder } from "@/components/screen-placeholder";
import { Strings } from "@/constants/strings";

export default function messageScreen() {
  return (
    <ScreenPlaceholder
      icon="heart"
      title={Strings.tabs.messages}
      subtitle="Messages (Phase 3)."
    />
  );
}
