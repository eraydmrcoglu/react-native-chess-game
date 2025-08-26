import React from "react";
import { Stack } from "expo-router";
import { SettingsProvider, useSettings } from "../context/SettingsContext";

function Inner() {
  const { darkTheme } = useSettings();
  const bg   = darkTheme ? "#0F1216" : "#FAFAFA";
  const text = darkTheme ? "#E5E7EB" : "#111827";
  const accent = "#C6906D";

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: bg },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="play" /> 
      <Stack.Screen
        name="settings"
        options={{
          headerShown: true,
          title: "Settings",
          headerBackTitle: "Home",
          headerShadowVisible: false,
          headerTintColor: accent,
          headerStyle: { backgroundColor: bg },
          headerTitleStyle: { color: text, fontWeight: "700" },
        }}
      />
    </Stack>
  );
}

export default function Root() {
  return (
    <SettingsProvider>
      <Inner />
    </SettingsProvider>
  );
}
