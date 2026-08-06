import { Stack } from "expo-router";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";

/**
 * For AI AGENT
 * WHY THIS FILE EXISTS
 * A folder + `_layout.tsx` tells Expo Router "these sibling files are screens
 * inside a navigator":
 *
 *   create/_layout.tsx     → this navigator
 *   create/index.tsx       → the create form  (what /create shows)
 *   create/post-tab.tsx    → same form, kept as a route
 *   create/product-tab.tsx → same form, opened with selling switched on
 *
 * This used to be a <TopTabs> navigator with a Post tab and a Product tab. The
 * two forms were ~90% identical, so they were merged into one screen where a
 * "Sell this item" toggle reveals the product fields. With one screen there is
 * nothing to switch between, so the top bar is gone and this is a plain Stack.
 *
 * The two tab files stay as routes — nothing links to them, but they still work
 * if you navigate to them directly.
 *
 * <SafeAreaView edges={["top"]}> keeps the form clear of the notch / status bar.
 * Only the TOP edge is padded — the bottom is already covered by the app's
 * bottom tab bar, and padding it again would leave a dead gap above it.
 */
export default function CreateLayout() {
    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <View style={styles.safeArea}>
                <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="index" />
                    <Stack.Screen name="post-tab" />
                    <Stack.Screen name="product-tab" />
                </Stack>
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
        backgroundColor: Colors.background,
    },
});
