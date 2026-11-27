import { Stack } from "expo-router";
import { WEB_DELETE } from "../../../src/copy/accountData";
import { useShell } from "../../../src/navigation/shell";
import { DeleteAccount } from "../../../src/screens/DeleteAccount";

/**
 * "Delete your account" (E12 S9): a pushed page, since the platform alert cannot hold the typed
 * phrase. On `deleted` the session gate replaces the whole shell with the confirmation.
 */
export default function DeleteAccountRoute() {
  const shell = useShell();
  return (
    <>
      <Stack.Screen options={{ title: WEB_DELETE.heading }} />
      <DeleteAccount offline={shell.offline} />
    </>
  );
}
