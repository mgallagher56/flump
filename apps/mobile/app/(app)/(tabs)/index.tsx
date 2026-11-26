import { router } from "expo-router";
import {
  ADD_ACCOUNT_WEB_ROUTE,
  ADD_HOME_VALUE_WEB_ROUTE,
  NET_WORTH_SETTINGS_WEB_ROUTE,
  SET_UP_WEB_ROUTE,
  useShell,
  webLink,
} from "../../../src/navigation/shell";
import { Home } from "../../../src/screens/Home";
import { Offline } from "../../../src/screens/Offline";

/**
 * Home: net worth and the check-in row (S5). Restored without reaching Flump, Home says so with
 * Try again while the other tabs stay usable (S7 brings saved figures offline).
 */
export default function HomeTab() {
  const shell = useShell();
  if (shell.offline) return <Offline onRetry={shell.retry} onSignOut={shell.signOut} />;
  return (
    <Home
      onSignOut={shell.signOut}
      onOpenCheckIn={() => router.push("/check-in")}
      marketingOrigin={shell.marketingOrigin}
      links={{
        setUp: webLink(shell, SET_UP_WEB_ROUTE),
        addAccount: webLink(shell, ADD_ACCOUNT_WEB_ROUTE),
        changeWhatCounts: webLink(shell, NET_WORTH_SETTINGS_WEB_ROUTE),
        addEstimate: webLink(shell, ADD_HOME_VALUE_WEB_ROUTE),
      }}
    />
  );
}
