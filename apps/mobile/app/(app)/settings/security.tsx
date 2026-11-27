import { Stack } from "expo-router";
import { SETTINGS } from "../../../src/copy/settings";
import { SECURITY_SETTINGS_WEB_ROUTE, useShell, webLink } from "../../../src/navigation/shell";
import { SettingsSecurity } from "../../../src/screens/SettingsSecurity";

/** Settings, Security (E12 S9): the account email, and Change password on the website. */
export default function SettingsSecurityRoute() {
  const shell = useShell();
  return (
    <>
      <Stack.Screen options={{ title: SETTINGS.security }} />
      <SettingsSecurity
        offline={shell.offline}
        changePassword={webLink(shell, SECURITY_SETTINGS_WEB_ROUTE)}
      />
    </>
  );
}
