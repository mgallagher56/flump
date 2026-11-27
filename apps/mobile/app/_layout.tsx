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
import { sessionHoldsData } from "../src/auth/sessionMachine";
import { loadSignInConfig } from "../src/config";
import { HOME_TITLE } from "../src/copy/brand";
import { ApiProvider } from "../src/data/ApiProvider";
import { createQueryClient } from "../src/data/queryClient";
import { deviceThemePreferenceStore } from "../src/device/themePreference";
import { useUpdateRequired } from "../src/features/app-update/useUpdateRequired";
import { useStackScreenOptions } from "../src/navigation/stackOptions";
import { UpdateRequired } from "../src/screens/UpdateRequired";
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
    const { session, api, checkForUpdate, accountData, appLock } = createAppSession(config);
    return {
      app: {
        session,
        api,
        checkForUpdate,
        accountData,
        appLock,
        marketingOrigin: config.site.marketingOrigin,
        webAppOrigin: config.site.webAppOrigin,
      },
    };
  } catch {
    return { app: null, problem: { kind: "misconfigured" } };
  }
}

function ThemedStack() {
  const theme = useTheme();
  const screenOptions = useStackScreenOptions();
  return (
    <>
      <StatusBar style={theme.scheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={screenOptions}>
        {/* Signed in: the gate, the tabs and their pages, with their own stack (S4). */}
        <Stack.Screen name="(app)" options={{ headerShown: false, title: HOME_TITLE }} />
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

/**
 * The version gate (plan section 4.9), above every route: below the server's minimum nothing else
 * shows, signed in or not. The check fails open.
 */
function UpdateGate({ children }: { children: ReactNode }) {
  const app = useSession();
  const { required, recheck } = useUpdateRequired(app?.checkForUpdate);
  return required ? <UpdateRequired onCheckAgain={recheck} /> : children;
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
  const signedIn = app ? sessionHoldsData(app.state.status) : false;
  return (
    <ApiProvider client={app?.api ?? null} queryClient={queryClient} signedIn={signedIn}>
      {children}
    </ApiProvider>
  );
}

export default function RootLayout() {
  const [{ app, problem }] = useState(startApp);
  // Any read answering 410 account_deleted shows the last step of the deletion (E12 S9).
  const [queryClient] = useState(() =>
    createQueryClient({ onAccountDeleted: () => app?.session.deletionPending() }),
  );
  // The colour theme choice, read before the first frame and kept through sign-out (E12 S9).
  const [themeStore] = useState(deviceThemePreferenceStore);
  return (
    <ThemeProvider store={themeStore}>
      {/* A null app makes the first route say why sign-in is off; dev screens still open. */}
      <SessionProvider app={app} problem={problem}>
        <DataLayer queryClient={queryClient}>
          <UpdateGate>
            <ThemedStack />
          </UpdateGate>
        </DataLayer>
      </SessionProvider>
    </ThemeProvider>
  );
}
