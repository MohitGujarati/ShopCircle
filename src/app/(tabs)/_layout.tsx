import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";

import { Strings } from "@/constants/strings";
import { Colors, Radius, Spacing } from "@/constants/theme";

/**
 RULE: each `name` must match a file in this folder —
 index.tsx · explore.tsx · create.tsx · activity.tsx · profile.tsx
 */

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{

        headerShown: true,
        headerStyle: { backgroundColor: Colors.background },
        headerShadowVisible: false,
        headerTitle: Strings.app.name,
        headerTitleAlign: "center",
        headerTitleStyle: {
          fontFamily: "GrandHotel",
          fontSize: 28,
          marginTop: 15,
          color: Colors.textPrimary,
        },

        headerLeft: () => (
          <View style={styles.headerIcon}>
            <Ionicons name="add" size={30} color={Colors.textPrimary}
              onPress={() => console.log("Create Post")} />
          </View>
        ),
        headerRight: () => (
          <View style={styles.headerIcon}>

            <Ionicons name="heart-outline" size={26} color={Colors.textPrimary}
              onPress={() => console.log("Activity")
              } />
          </View>
        ),

        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          backgroundColor: Colors.background,
          borderTopColor: Colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
        },
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >

      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: () => null,
          title: Strings.tabs.home,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={size} color={color} />

          ),
        }}
      />

      <Tabs.Screen
        name="explore"

        options={{
          headerShown: false,
          tabBarLabel: () => null,

          title: Strings.tabs.explore,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "search" : "search-outline"} size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="create"
        options={{
          title: Strings.tabs.create,
          tabBarLabel: () => null, // the red button is enough — no text label
          tabBarIcon: () => (
            <View style={styles.createButton}>
              <Ionicons name="add" size={26} color={Colors.onPrimary} />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="messages"
        options={{
          tabBarLabel: () => null,
          title: Strings.tabs.messages,
          tabBarBadge: 3,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "paper-plane" : "paper-plane-outline"} size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          headerShown: false,
          tabBarLabel: () => null,
          title: Strings.tabs.profile,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  // Comfortable tap padding + breathing room from the screen edges for the
  // header's left (+) and right (♡) icons.
  headerIcon: {
    paddingHorizontal: Spacing.lg,
    marginTop: 15,
  },

  createButton: {
    width: 62,
    height: 62,
    borderRadius: Radius.full,
    marginBottom: 20,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
