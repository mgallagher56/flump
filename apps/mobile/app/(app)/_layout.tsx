import { Stack } from "expo-router";
import { HOME_TITLE } from "../../src/copy/brand";
import { CHECK_IN } from "../../src/copy/checkIn";
import { useStackScreenOptions } from "../../src/navigation/stackOptions";
import { SessionGate } from "../../src/screens/SessionGate";

/**
 * The tabs sit under every page, so a page opened cold by a `flump://` link still has Back to them
 * (and the tab bar beneath).
 */
export const unstable_settings = { initialRouteName: "(tabs)" };

/**
 * Everything signed in (E12 S4, plan 9.7): the gate shows the screen for the session's state, and
 * while someone is signed in, the tabs with the pages they open on top.
 */
export default function SignedInLayout() {
  const screenOptions = useStackScreenOptions();
  return (
    <SessionGate>
      <Stack screenOptions={screenOptions}>
        {/* The title is what iOS's back button on the next screen reads. */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: HOME_TITLE }} />
        <Stack.Screen name="check-in" options={{ title: CHECK_IN.title }} />
        <Stack.Screen name="page/[key]" />
      </Stack>
    </SessionGate>
  );
}
