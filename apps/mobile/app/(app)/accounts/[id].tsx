import { router, Stack, useLocalSearchParams } from "expo-router";
import {
  DEBTS_WEB_ROUTE,
  MORTGAGE_WEB_ROUTE,
  SET_UP_WEB_ROUTE,
  useShell,
  webLink,
} from "../../../src/navigation/shell";
import { AccountDetail } from "../../../src/screens/AccountDetail";
import { OfflineReading } from "../../../src/screens/OfflineReading";

/**
 * One account's page (S6), also opened by `flump://accounts/<id>`. The header carries the
 * account's name. Restored without reaching Flump, it shows the saved figures with their age (S7), or says so with Try again.
 */
export default function AccountDetailRoute() {
  const shell = useShell();
  const { id = "" } = useLocalSearchParams<{ id: string }>();
  return (
    <OfflineReading>
      <AccountDetail
        id={id}
        onSignOut={shell.signOut}
        marketingOrigin={shell.marketingOrigin}
        links={{
          setUp: webLink(shell, SET_UP_WEB_ROUTE),
          mortgage: webLink(shell, MORTGAGE_WEB_ROUTE),
          debts: webLink(shell, DEBTS_WEB_ROUTE),
        }}
        onBackToAccounts={() => router.navigate("/accounts")}
        onEdit={() => router.push({ pathname: "/accounts/[id]/edit", params: { id } })}
        header={(title) => <Stack.Screen options={{ title }} />}
      />
    </OfflineReading>
  );
}
