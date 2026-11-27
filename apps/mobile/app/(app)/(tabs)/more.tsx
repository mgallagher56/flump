import { type Href, router } from "expo-router";
import { useProfile } from "../../../src/data/profile";
import { useShell } from "../../../src/navigation/shell";
import { More } from "../../../src/screens/More";

/** Settings has its own list (E12 S9); every other row opens its page. */
const pathFor = (key: string): Href =>
  key === "settings" ? "/settings" : { pathname: "/page/[key]", params: { key } };

export default function MoreTab() {
  const shell = useShell();
  // The pages the person has switched on; restored offline nothing is read, so the defaults.
  const profile = useProfile({ enabled: !shell.offline });
  return (
    <More
      onOpenPage={(key) => router.push(pathFor(key))}
      onSignOut={shell.signOut}
      enabledPages={profile.data?.enabledPages}
    />
  );
}
