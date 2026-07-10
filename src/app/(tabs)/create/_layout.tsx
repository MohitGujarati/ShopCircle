import { Ionicons } from "@expo/vector-icons";
import { TopTabs } from "expo-router/js-top-tabs";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Strings } from "@/constants/strings";
import { Colors } from "@/constants/theme";

/** What the navigator passes to a `tabBarIcon`. `color` is already resolved to
 *  the active or inactive tint for us, so we only read `focused` to pick the
 *  filled-vs-outline icon. */
type TabIconProps = { focused: boolean; color: string };

/**
 * For AI AGENT
 * WHY THIS FILE EXISTS
 * A folder + `_layout.tsx` tells Expo Router "these sibling files are screens
 * inside a navigator". Here the navigator is <TopTabs>, so each sibling file
 * becomes a swipeable tab with a bar across the top:
 *
 *   create/_layout.tsx     → this navigator (the top bar)
 *   create/post-tab.tsx    → "Post"    tab
 *   create/product-tab.tsx → "Product" tab
 *
 * NOTE: <TopTabs> comes from `expo-router/js-top-tabs`, NOT from
 * `@react-navigation/material-top-tabs`. Since SDK 56, Expo Router bundles its
 * own React Navigation and importing that package directly is a build error.
 * See https://docs.expo.dev/router/migrate/sdk-55-to-56/
 *
 * <SafeAreaView edges={["top"]}> keeps the bar clear of the notch / status bar.
 * Only the TOP edge is padded — the bottom is already covered by the app's
 * bottom tab bar, and padding it again would leave a dead gap above it.
 */
export default function CreateLayout() {
    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <View style={styles.safeArea}>
                <TopTabs
                    screenOptions={{
                        // Material top tabs show LABELS and hide icons by default.
                        // We want the opposite, so BOTH flags are required.
                        tabBarShowIcon: true,
                        tabBarShowLabel: false,
                        tabBarActiveTintColor: Colors.text,
                        tabBarInactiveTintColor: Colors.textSecondary,
                        tabBarStyle: {
                            backgroundColor: Colors.background,
                            elevation: 0, // Android: remove the default drop shadow
                            shadowOpacity: 0, // iOS: same
                            borderBottomWidth: StyleSheet.hairlineWidth,
                            borderBottomColor: Colors.border,
                        },
                        // The sliding underline beneath the active icon.
                        tabBarIndicatorStyle: { backgroundColor: Colors.text, height: 2 },
                        // Android's default press ripple looks muddy on a white bar.
                        tabBarPressColor: "transparent",
                    }}
                >
                    {/* `name` must match the filename (without extension).
                    `title` isn't drawn (labels are off) but screen readers announce it. */}
                    <TopTabs.Screen
                        name="product-tab"
                        options={{
                            title: Strings.create.tabs.post,
                            tabBarIcon: ({ focused, color }: TabIconProps) => (
                                <Ionicons name={focused ? "prism" : "prism-outline"} size={22} color={color} />
                            ),
                        }}
                    />
                    <TopTabs.Screen
                        name="post-tab"
                        options={{
                            title: Strings.create.tabs.product,
                            tabBarIcon: ({ focused, color }: TabIconProps) => (
                                <Ionicons
                                    name={focused ? "grid" : "grid-outline"}
                                    size={22}
                                    color={color}
                                />
                            ),
                        }}
                    />
                </TopTabs>
            </View>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    safeArea: {
        flex: 1,
        marginTop: 30,
        backgroundColor: Colors.background,
    },
});
