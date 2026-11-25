import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { type ReactNode, useState } from "react";
import type * as AuthDeps from "../src/auth/authDeps";
import { missingNativeModules } from "../src/auth/nativeModules";
import {
  type AppSession,
  SessionProvider,
  type StartProblem,
  useSession,
} from "../src/auth/SessionProvider";
import { loadSignInConfig } from "../src/config";
import { CHECK_IN } from "../src/copy/checkIn";
import { ApiProvider } from "../src/data/ApiProvider";
import { createQueryClient } from "../src/data/queryClient";
import { ThemeProvider, useTheme } from "../src/theme/ThemeProvider";

/**
 * Reads the config once. A bad value stops sign-in before any network call (plan section 5.3).
 * The sign-in code loads native modules as it is imported, so it is required only once they are
 * known to be there: a host app without them (Expo Go) then still opens, and says so.
 */
function startApp(): { app: AppSession | null; problem?: StartProblem } {
  const missing = missingNativeModules();
  if (missing.length > 0) return { app: null, problem: { kind: "unavailable", missing } };
  try {
    const config = loadSignInConfig();
    const { createAppSession }: typeof AuthDeps = require("../src/auth/authDeps");
    const { session, api } = createAppSession(config);
    return { app: { session, api, marketingOrigin: config.site.marketingOrigin } };
  } catch {
    return { app: null, problem: { kind: "misconfigured" } };
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
        <Stack.Screen name="(app)/index" options={{ headerShown: false }} />
        <Stack.Screen name="(app)/check-in" options={{ title: CHECK_IN.title }} />
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

/** The API client and the query cache, which is dropped whenever nobody is signed in. */
function DataLayer({
  queryClient,
  children,
}: {
  queryClient: ReturnType<typeof createQueryClient>;
  children: ReactNode;
}) {
  const app = useSession();
  const status = app?.state.status;
  const signedIn = status === "signedIn" || status === "restoredOffline";
  return (
    <ApiProvider client={app?.api ?? null} queryClient={queryClient} signedIn={signedIn}>
      {children}
    </ApiProvider>
  );
}

export default function RootLayout() {
  const [{ app, problem }] = useState(startApp);
  const [queryClient] = useState(createQueryClient);
  return (
    <ThemeProvider>
      {/* A null app makes the first route say why sign-in is off; dev screens still open. */}
      <SessionProvider app={app} problem={problem}>
        <DataLayer queryClient={queryClient}>
          <ThemedStack />
        </DataLayer>
      </SessionProvider>
    </ThemeProvider>
  );
}
