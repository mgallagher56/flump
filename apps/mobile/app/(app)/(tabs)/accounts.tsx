import { router } from "expo-router";
import {
  ADD_ACCOUNT_WEB_ROUTE,
  ADD_HOME_VALUE_WEB_ROUTE,
  NET_WORTH_SETTINGS_WEB_ROUTE,
  SET_UP_WEB_ROUTE,
  useShell,
  webLink,
} from "../../../src/navigation/shell";
import { Accounts } from "../../../src/screens/Accounts";
import { Offline } from "../../../src/screens/Offline";

/**
 * Accounts: the list of what you own and owe (S6). Restored without reaching Flump, it says so
 * with Try again while the other tabs stay usable, as Home does.
 */
export default function AccountsTab() {
  const shell = useShell();
  if (shell.offline) return <Offline onRetry={shell.retry} onSignOut={shell.signOut} />;
  return (
    <Accounts
      onSignOut={shell.signOut}
      marketingOrigin={shell.marketingOrigin}
      onOpenAccount={(id) => router.push({ pathname: "/accounts/[id]", params: { id } })}
      onOpenHistory={() => router.push("/accounts/history")}
      onOpenCheckIn={() => router.push("/check-in")}
      links={{
        setUp: webLink(shell, SET_UP_WEB_ROUTE),
        addAccount: webLink(shell, ADD_ACCOUNT_WEB_ROUTE),
        changeWhatCounts: webLink(shell, NET_WORTH_SETTINGS_WEB_ROUTE),
        addEstimate: webLink(shell, ADD_HOME_VALUE_WEB_ROUTE),
      }}
    />
  );
}
