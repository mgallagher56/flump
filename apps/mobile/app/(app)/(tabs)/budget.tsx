import { router } from "expo-router";
import {
  BUDGET_WEB_ROUTE,
  MORTGAGE_WEB_ROUTE,
  SALARY_WEB_ROUTE,
  SET_UP_WEB_ROUTE,
  useShell,
  webLink,
} from "../../../src/navigation/shell";
import { Budget } from "../../../src/screens/Budget";
import { OfflineReading } from "../../../src/screens/OfflineReading";

/**
 * Budget (E12 S10): web's Budget page for the same rows, with the editing core for the person's
 * own entries. Restored without reaching Flump, it shows the saved figures with their age and no
 * editing (S7), or says so with Try again, as Home does.
 */
export default function BudgetTab() {
  const shell = useShell();
  return (
    <OfflineReading>
      <Budget
        onSignOut={shell.signOut}
        marketingOrigin={shell.marketingOrigin}
        onOpenAccounts={() => router.navigate("/accounts")}
        links={{
          setUp: webLink(shell, SET_UP_WEB_ROUTE),
          budget: webLink(shell, BUDGET_WEB_ROUTE),
          mortgage: webLink(shell, MORTGAGE_WEB_ROUTE),
          salary: webLink(shell, SALARY_WEB_ROUTE),
        }}
      />
    </OfflineReading>
  );
}
