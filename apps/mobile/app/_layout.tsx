import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { createAppSession } from "../src/auth/authDeps";
import { SessionProvider } from "../src/auth/SessionProvider";
import { loadSignInConfig } from "../src/config";
import { ThemeProvider, useTheme } from "../src/theme/ThemeProvider";

/** Reads the config once. A bad value stops sign-in before any network call (plan section 5.3). */
function startApp() {
  try {
    const config = loadSignInConfig();
    return { session: createAppSession(config), marketingOrigin: config.site.marketingOrigin };
  } catch {
    return null;
  }
}

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
        <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
        {__DEV__ ? (
          <Stack.Screen name="(dev)/engine-check" options={{ title: "Device check" }} />
        ) : null}
        {__DEV__ ? (
          <Stack.Screen name="(dev)/gallery" options={{ title: "Component gallery" }} />
        ) : null}
        {__DEV__ ? (
          <Stack.Screen name="(dev)/sign-in-check" options={{ title: "Sign-in check" }} />
        ) : null}
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [app] = useState(startApp);
  return (
    <ThemeProvider>
      {/* A null app makes the first route show "This build is misconfigured"; dev screens still open. */}
      <SessionProvider app={app}>
        <ThemedStack />
      </SessionProvider>
    </ThemeProvider>
  );
}
