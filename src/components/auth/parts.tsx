/**
 * Shared building blocks for the Login and Registration screens. Both screens
 * are just a few of these stacked together, so the actual styling lives here
 * once instead of being copy-pasted into two files.
 */
import { Strings } from "@/constants/strings";
import { Colors, Radius, Spacing, Typography } from "@/constants/theme";
import Ionicons from "@expo/vector-icons/Ionicons";
import { type ReactNode, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// -------------------------------------------------------------------------
// AuthScreen — shared page scaffold for Login & Registration: the ShopCircle
// wordmark up top, a title + subtitle, the form (children), and a footer link
// to the other screen. Handles the keyboard pushing the form up on mobile.
// -------------------------------------------------------------------------
export function AuthScreen({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.wordmark}>{Strings.app.name}</Text>

          <View style={styles.heading}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          <View style={styles.form}>{children}</View>

          <View style={styles.footer}>{footer}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// A tappable "Sign up" / "Sign in" link used in each screen's footer.
export function FooterLink({
  prompt,
  action,
  onPress,
}: {
  prompt: string;
  action: string;
  onPress?: () => void;
}) {
  return (
    <Text style={styles.footerText}>
      {prompt}{" "}
      <Text style={styles.footerAction} onPress={onPress}>
        {action}
      </Text>
    </Text>
  );
}

// -------------------------------------------------------------------------
// AuthField — a labeled text input inside a rounded, bordered box.
// Pass `secure` for passwords; it adds a show/hide eye toggle for free.
// -------------------------------------------------------------------------
type AuthFieldProps = TextInputProps & {
  label: string;
  secure?: boolean;
};

export function AuthField({ label, secure, ...inputProps }: AuthFieldProps) {
  const [hidden, setHidden] = useState(true);

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputBox}>
        <TextInput
          style={styles.input}
          placeholderTextColor={Colors.textSecondary}
          secureTextEntry={secure ? hidden : false}
          autoCapitalize="none"
          {...inputProps}
        />
        {secure ? (
          <Ionicons
            name={hidden ? "eye-outline" : "eye-off-outline"}
            size={20}
            color={Colors.textSecondary}
            onPress={() => setHidden((v) => !v)}
          />
        ) : null}
      </View>
    </View>
  );
}

// -------------------------------------------------------------------------
// PrimaryButton — the solid red call-to-action (Sign in / Create account).
// -------------------------------------------------------------------------
export function PrimaryButton({
  label,
  onPress,
}: {
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryBtn,
        pressed && { backgroundColor: Colors.primaryDark },
      ]}
    >
      <Text style={styles.primaryBtnText}>{label}</Text>
    </Pressable>
  );
}

// -------------------------------------------------------------------------
// GoogleButton — outlined secondary action (real Google auth wired later).
// -------------------------------------------------------------------------
export function GoogleButton({
  label,
  onPress,
}: {
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.googleBtn,
        pressed && { backgroundColor: Colors.surface },
      ]}
    >
      <Ionicons name="logo-google" size={18} color={Colors.text} />
      <Text style={styles.googleBtnText}>{label}</Text>
    </Pressable>
  );
}

// -------------------------------------------------------------------------
// OrDivider — a thin line with a word ("or") in the middle.
// -------------------------------------------------------------------------
export function OrDivider({ label }: { label: string }) {
  return (
    <View style={styles.dividerRow}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerText}>{label}</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
    gap: Spacing.xl,
  },
  wordmark: {
    fontFamily: "GrandHotel",
    fontSize: 40,
    color: Colors.primary,
    textAlign: "center",
  },
  heading: {
    gap: Spacing.xs,
  },
  title: {
    textAlign: "center",
    ...Typography.displayLg,
    color: Colors.text,
  },
  subtitle: {
    textAlign: "center",

    ...Typography.bodyLg,
    color: Colors.textSecondary,
  },
  form: {
    gap: Spacing.lg,
  },
  footer: {
    alignItems: "center",
  },
  footerText: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
  },
  footerAction: {
    ...Typography.labelBold,
    fontSize: 14,
    color: Colors.primary,
  },

  fieldWrap: {
    gap: Spacing.xs,
  },
  label: {
    ...Typography.labelBold,
    color: Colors.textPrimary,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    borderRadius: Radius.md,
  },
  input: {
    flex: 1,
    ...Typography.bodyLg,
    color: Colors.textPrimary,
    // padding:0 keeps the text vertically centered inside our fixed-height box.
    padding: 0,
  },

  primaryBtn: {
    height: 52,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    ...Typography.labelBold,
    fontSize: 16,
    color: Colors.onPrimary,
  },

  googleBtn: {
    flexDirection: "row",
    gap: Spacing.sm,
    height: 52,
    borderRadius: Radius.md,
    backgroundColor: Colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  googleBtnText: {
    ...Typography.labelBold,
    fontSize: 16,
    color: Colors.text,
  },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },
  dividerText: {
    ...Typography.labelSm,
    color: Colors.textSecondary,
  },
});
