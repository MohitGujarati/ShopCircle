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

  // Render nothing while the font loads — the splash screen stays visible.
  if (!fontsLoaded) {
    return null;
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
