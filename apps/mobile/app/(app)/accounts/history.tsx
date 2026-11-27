import { router } from "expo-router";
import {
  NET_WORTH_HISTORY_WEB_ROUTE,
  SET_UP_WEB_ROUTE,
  useShell,
  webLink,
} from "../../../src/navigation/shell";
import { NetWorthHistory } from "../../../src/screens/NetWorthHistory";
import { OfflineReading } from "../../../src/screens/OfflineReading";

/**
 * Net worth history (S6), also opened by `flump://accounts/history`, from the Accounts list and
 * Home's trend bars. Restored without reaching Flump, it shows the saved figures with their age (S7), or says so with Try again.
 */
export default function NetWorthHistoryRoute() {
  const shell = useShell();
  return (
    <OfflineReading>
      <NetWorthHistory
        onSignOut={shell.signOut}
        marketingOrigin={shell.marketingOrigin}
        onOpenCheckIn={() => router.push("/check-in")}
        onAddAccount={() => router.push("/accounts/new")}
        links={{
          setUp: webLink(shell, SET_UP_WEB_ROUTE),
          addEarlierMonths: webLink(shell, NET_WORTH_HISTORY_WEB_ROUTE),
        }}
      />
    </OfflineReading>
  );
}
