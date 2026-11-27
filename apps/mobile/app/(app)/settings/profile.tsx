import { Stack, useLocalSearchParams } from "expo-router";
import { SETTINGS } from "../../../src/copy/settings";
import {
  PROFILE_SETTINGS_WEB_ROUTE,
  SET_UP_WEB_ROUTE,
  useShell,
  webLink,
} from "../../../src/navigation/shell";
import { SettingsProfile } from "../../../src/screens/SettingsProfile";

/** Settings, Profile (E12 S9). `?focus=net-worth` opens it at the net worth choices (Home's link). */
export default function SettingsProfileRoute() {
  const shell = useShell();
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  return (
    <>
      <Stack.Screen options={{ title: SETTINGS.profile }} />
      <SettingsProfile
        offline={shell.offline}
        onRetry={shell.retry}
        onSignOut={shell.signOut}
        marketingOrigin={shell.marketingOrigin}
        setUp={webLink(shell, SET_UP_WEB_ROUTE)}
        website={webLink(shell, PROFILE_SETTINGS_WEB_ROUTE)}
        focus={focus === "net-worth" ? "netWorth" : undefined}
      />
    </>
  );
}
