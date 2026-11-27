import { router, Stack, useLocalSearchParams } from "expo-router";
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
  if (shell.offline) return <Offline onRetry={shell.retry} onSignOut={shell.signOut} />;
  return (
    <AccountFormScreen
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
