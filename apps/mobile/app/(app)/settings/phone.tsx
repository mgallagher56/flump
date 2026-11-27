import { Stack } from "expo-router";
import { SETTINGS } from "../../../src/copy/settings";
import { SettingsPhone } from "../../../src/screens/SettingsPhone";

/** Settings, This phone (E12 S9): the colour theme and app lock, kept on this phone. */
export default function SettingsPhoneRoute() {
  return (
    <>
      <Stack.Screen options={{ title: SETTINGS.phone }} />
      <SettingsPhone />
    </>
  );
}
