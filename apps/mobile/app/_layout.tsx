import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider, useTheme } from "../src/theme/ThemeProvider";

function ThemedStack() {
  const theme = useTheme();
  return (
    <>
      <StatusBar style={theme.scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: theme.colors["surface.canvas"] },
          headerStyle: { backgroundColor: theme.colors["surface.canvas"] },
          headerTintColor: theme.colors["text.primary"],
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        {__DEV__ ? (
          <Stack.Screen name="(dev)/engine-check" options={{ title: "Device check" }} />
        ) : null}
        {__DEV__ ? (
          <Stack.Screen name="(dev)/gallery" options={{ title: "Component gallery" }} />
        ) : null}
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ThemedStack />
    </ThemeProvider>
  );
}
