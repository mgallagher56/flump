import { router } from "expo-router";
import {
  NET_WORTH_HISTORY_WEB_ROUTE,
  SET_UP_WEB_ROUTE,
  useShell,
  webLink,
} from "../../../src/navigation/shell";
import { NetWorthHistory } from "../../../src/screens/NetWorthHistory";
import { Offline } from "../../../src/screens/Offline";

/**
 * Net worth history (S6), also opened by `flump://accounts/history`, from the Accounts list and
 * Home's trend bars. Restored without reaching Flump, it says so with Try again.
 */
export default function NetWorthHistoryRoute() {
  const shell = useShell();
  if (shell.offline) return <Offline onRetry={shell.retry} onSignOut={shell.signOut} />;
  return (
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
  );
}
