import { AuthProvider } from "@/hooks/useAuth";
import { GrandHotel_400Regular } from "@expo-google-fonts/grand-hotel";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

// Keep the native splash screen up until our custom font has finished loading,
// so the UI never flashes the wrong (system) font first.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // useFonts registers fonts by name. The KEY ("GrandHotel") is the string you
  // pass to `fontFamily` in styles; the VALUE is the imported font module.
  const [fontsLoaded] = useFonts({
    GrandHotel: GrandHotel_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  // Expo Router auto-discovers every file in app/ as a screen — the auth
  // decision is NOT made here. app/index.tsx is the gate at "/": it redirects
  // to /home or /login based on login state. Here we only set screen options.
  // `name` is always a FILE segment (index, (tabs), login, camera), never a URL.
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" />
        <Stack.Screen name="registration" />

        {/* Pushed over the tabs, so it hides the bottom tab bar. Sliding up from
            the bottom is what makes it read as a camera rather than a page. */}
        <Stack.Screen name="camera" options={{ animation: "slide_from_bottom" }} />
      </Stack>
    </AuthProvider>
  );
}
