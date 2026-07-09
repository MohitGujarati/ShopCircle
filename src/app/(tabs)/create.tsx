import { ScreenPlaceholder } from "@/components/screen-placeholder";
import { Strings } from "@/constants/strings";

export default function CreateScreen() {
  return (
    <ScreenPlaceholder
      icon="add-circle-outline"
      title={Strings.create.title}
      subtitle="Publish a product post (Phase 3)."
    />
  );
}
