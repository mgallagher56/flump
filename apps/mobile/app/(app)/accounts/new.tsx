import { router, Stack, useLocalSearchParams } from "expo-router";
import { useShownOnline } from "../../../src/features/offline/useShownOnline";
import { useShell } from "../../../src/navigation/shell";
import { AccountFormScreen } from "../../../src/screens/AccountForm";
import { Offline } from "../../../src/screens/Offline";

/**
 * Add an account (S8), also opened by `flump://accounts/new`; `?estimate=1` opens it as web's
 * "Add an estimate" does. Restored without reaching Flump, it says so with Try again.
 */
export default function NewAccountRoute() {
  const shell = useShell();
  const { estimate } = useLocalSearchParams<{ estimate?: string }>();
  // Opened offline it says so; already open when the connection drops, the form stays with what
  // was typed and its Save waits for the connection (E12 S7 follow-up).
  const shownOnline = useShownOnline(shell.offline);
  if (shell.offline && !shownOnline) {
    return <Offline onRetry={shell.retry} onSignOut={shell.signOut} />;
  }
  return (
    <AccountFormScreen
      offline={shell.offline}
      open={{ kind: "add", estimate: estimate === "1" }}
      onSaved={(notice) =>
        notice
          ? router.navigate({ pathname: "/accounts", params: { notice: "mortgage-not-linked" } })
          : router.back()
      }
      onDeleted={() => router.navigate("/accounts")}
      onCancel={() => router.back()}
      onBackToAccounts={() => router.navigate("/accounts")}
      header={(title) => <Stack.Screen options={{ title }} />}
    />
  );
}
