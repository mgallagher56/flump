import { router } from "expo-router";
import { useShell } from "../../../src/navigation/shell";
import { Home } from "../../../src/screens/Home";
import { Offline } from "../../../src/screens/Offline";

/**
 * Home: the check-in row until S5 brings the figures. Restored without reaching Flump, Home says
 * so with Try again while the other tabs stay usable (S7 brings saved figures offline).
 */
export default function HomeTab() {
  const shell = useShell();
  if (shell.offline) return <Offline onRetry={shell.retry} onSignOut={shell.signOut} />;
  return (
    <Home
      onSignOut={shell.signOut}
      onOpenCheckIn={() => router.push("/check-in")}
      marketingOrigin={shell.marketingOrigin}
    />
  );
}
