import { router, Stack, useLocalSearchParams } from "expo-router";
import { useShell } from "../../../../src/navigation/shell";
import { AccountFormScreen } from "../../../../src/screens/AccountForm";
import { Offline } from "../../../../src/screens/Offline";

/**
 * Edit an account (S8), also opened by `flump://accounts/<id>/edit`. Delete sits inside it, as
 * web's, and goes back to the accounts list. Restored without reaching Flump, it says so.
 */
export default function EditAccountRoute() {
  const shell = useShell();
  const { id = "" } = useLocalSearchParams<{ id: string }>();
  if (shell.offline) return <Offline onRetry={shell.retry} onSignOut={shell.signOut} />;
  return (
    <AccountFormScreen
      open={{ kind: "edit", id }}
      onSaved={() => router.back()}
      onDeleted={() => router.navigate("/accounts")}
      onCancel={() => router.back()}
      onBackToAccounts={() => router.navigate("/accounts")}
      header={(title) => <Stack.Screen options={{ title }} />}
    />
  );
}
