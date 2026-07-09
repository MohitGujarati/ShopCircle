import Ionicons from "@expo/vector-icons/Ionicons";
import { type ComponentProps } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Colors, Spacing, Typography } from "@/constants/theme";

// The set of valid Ionicons names, pulled straight from the component's props
// so autocomplete + type-checking work when we pass an `icon`.
type IoniconName = ComponentProps<typeof Ionicons>["name"];

type Props = {
  icon: IoniconName;
  title: string;
  subtitle?: string;
};

/**
 * A simple centered placeholder we reuse on every not-yet-built screen.
 * Writing it once (instead of copy-pasting the same JSX into 5 files) is the
 * whole point of a shared component — change it here, every screen updates.
 */
export function ScreenPlaceholder({ icon, title, subtitle }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={40} color={Colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  title: {
    ...Typography.displayLg,
    color: Colors.text,
  },
  subtitle: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    textAlign: "center",
  },
});
