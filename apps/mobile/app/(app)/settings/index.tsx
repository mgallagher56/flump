import { router, Stack } from "expo-router";
import { SETTINGS } from "../../../src/copy/settings";
import { Settings } from "../../../src/screens/Settings";

/** Settings (E12 S9): More's Settings row and `flump://page/settings` open this list. */
export default function SettingsRoute() {
  return (
    <>
      <Stack.Screen options={{ title: SETTINGS.title }} />
      <Settings onOpen={(key) => router.push(`/settings/${key}`)} />
    </>
  );
}
