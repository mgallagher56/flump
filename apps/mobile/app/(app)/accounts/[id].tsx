import { router, Stack, useLocalSearchParams } from "expo-router";
import {
  accountWebRoute,
  DEBTS_WEB_ROUTE,
  MORTGAGE_WEB_ROUTE,
  SET_UP_WEB_ROUTE,
  useShell,
  webLink,
} from "../../../src/navigation/shell";
import { AccountDetail } from "../../../src/screens/AccountDetail";
import { Offline } from "../../../src/screens/Offline";

/**
 * One account's page (S6), also opened by `flump://accounts/<id>`. The header carries the
 * account's name. Restored without reaching Flump, it says so with Try again.
 */
export default function AccountDetailRoute() {
  const shell = useShell();
  const { id = "" } = useLocalSearchParams<{ id: string }>();
  if (shell.offline) return <Offline onRetry={shell.retry} onSignOut={shell.signOut} />;
  return (
    <AccountDetail
      id={id}
      onSignOut={shell.signOut}
      marketingOrigin={shell.marketingOrigin}
      links={{
        setUp: webLink(shell, SET_UP_WEB_ROUTE),
        edit: webLink(shell, accountWebRoute(id)),
        mortgage: webLink(shell, MORTGAGE_WEB_ROUTE),
        debts: webLink(shell, DEBTS_WEB_ROUTE),
      }}
      onBackToAccounts={() => router.navigate("/accounts")}
      header={(title) => <Stack.Screen options={{ title }} />}
    />
  );
}
