import { router, Stack } from "expo-router";
import { SETTINGS } from "../../../src/copy/settings";
import { useShell } from "../../../src/navigation/shell";
import { DataSettings } from "../../../src/screens/DataSettings";

/** Settings, Data (E12 S9): Download your data, Delete your account and the legal pages. */
export default function SettingsDataRoute() {
  const shell = useShell();
  return (
    <>
      <Stack.Screen options={{ title: SETTINGS.data }} />
      <DataSettings
        offline={shell.offline}
        marketingOrigin={shell.marketingOrigin}
        onOpenDelete={() => router.push("/settings/delete-account")}
      />
    </>
  );
}
