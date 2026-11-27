import { router, useLocalSearchParams } from "expo-router";
import { ACCOUNT_FORM } from "../../../src/copy/accountForms";
import {
  NET_WORTH_SETTINGS_ROUTE,
  SET_UP_WEB_ROUTE,
  useShell,
  webLink,
} from "../../../src/navigation/shell";
import { Accounts } from "../../../src/screens/Accounts";
import { OfflineReading } from "../../../src/screens/OfflineReading";

/**
 * Accounts: the list of what you own and owe (S6). Restored without reaching Flump, it shows the
 * saved figures with their age (S7), or says so with Try again, as Home does.
 */
export default function AccountsTab() {
  const shell = useShell();
  // A save that left something out comes back here with what to say (web's toast).
  const { notice } = useLocalSearchParams<{ notice?: string }>();
  return (
    <OfflineReading>
      <Accounts
        onSignOut={shell.signOut}
        marketingOrigin={shell.marketingOrigin}
        onOpenAccount={(id) => router.push({ pathname: "/accounts/[id]", params: { id } })}
        onAddAccount={() => router.push("/accounts/new")}
        onAddEstimate={() => router.push({ pathname: "/accounts/new", params: { estimate: "1" } })}
        notice={notice === "mortgage-not-linked" ? ACCOUNT_FORM.mortgageNotLinked : null}
        onOpenHistory={() => router.push("/accounts/history")}
        onOpenCheckIn={() => router.push("/check-in")}
        onChangeWhatCounts={() => router.push(NET_WORTH_SETTINGS_ROUTE)}
        links={{
          setUp: webLink(shell, SET_UP_WEB_ROUTE),
        }}
      />
    </OfflineReading>
  );
}
