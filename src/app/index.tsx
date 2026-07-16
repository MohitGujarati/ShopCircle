import { useAuth } from "@/hooks/useAuth";
import { type Href, Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { Routes } from "./navigation/nav";

// The auth gate at "/". It reads the real session from useAuth and sends the
// user to the right place. Everything else in the app trusts this decision.
export default function Index() {
    const { session, loading } = useAuth();

    // While we're still checking for a saved session, show a spinner instead of
    // flashing the login screen for a split second.
    if (loading) {
        return (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <ActivityIndicator />
            </View>
        );
    }

    // Routes come from a plain-JS file, so they're typed as `string`; Expo's
    // typed-routes want a specific Href, hence the cast.
    return <Redirect href={(session ? Routes.HOME : Routes.LOGIN) as Href} />;
}
