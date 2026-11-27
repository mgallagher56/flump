import { router } from "expo-router";
import {
  BUDGET_WEB_ROUTE,
  NET_WORTH_SETTINGS_ROUTE,
  SET_UP_WEB_ROUTE,
  useShell,
  webLink,
} from "../../../src/navigation/shell";
import { Home } from "../../../src/screens/Home";
import { OfflineReading } from "../../../src/screens/OfflineReading";

/**
 * Home: net worth, the two-figure strip and the check-in row (S5, S5b). Restored without reaching Flump, Home shows the saved figures with
 * their age (S7), or says it is offline with Try again while the other tabs stay usable.
 */
export default function HomeTab() {
  const shell = useShell();
  return (
    <OfflineReading>
      <Home
        onSignOut={shell.signOut}
        onOpenCheckIn={() => router.push("/check-in")}
        onOpenHistory={() => router.push("/accounts/history")}
        onChangeWhatCounts={() => router.push(NET_WORTH_SETTINGS_ROUTE)}
        onAddAccount={() => router.push("/accounts/new")}
        onAddEstimate={() => router.push({ pathname: "/accounts/new", params: { estimate: "1" } })}
        marketingOrigin={shell.marketingOrigin}
        links={{
          setUp: webLink(shell, SET_UP_WEB_ROUTE),
          addBudget: webLink(shell, BUDGET_WEB_ROUTE),
          addSpending: webLink(shell, BUDGET_WEB_ROUTE),
        }}
      />
    </OfflineReading>
  );
}
