import { router, Stack, useLocalSearchParams } from "expo-router";
import { useShownOnline } from "../../../../src/features/offline/useShownOnline";
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
  // Opened offline it says so; already open when the connection drops, the form stays with what
  // was typed and its Save waits for the connection (E12 S7 follow-up).
  const shownOnline = useShownOnline(shell.offline);
  if (shell.offline && !shownOnline) {
    return <Offline onRetry={shell.retry} onSignOut={shell.signOut} />;
  }
  return (
    <AccountFormScreen
      offline={shell.offline}
      open={{ kind: "edit", id }}
      onSaved={() => router.back()}
      onDeleted={() => router.navigate("/accounts")}
      onCancel={() => router.back()}
      onBackToAccounts={() => router.navigate("/accounts")}
      header={(title) => <Stack.Screen options={{ title }} />}
    />
  );
}
