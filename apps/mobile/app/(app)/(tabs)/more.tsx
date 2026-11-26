import { router } from "expo-router";
import { useShell } from "../../../src/navigation/shell";
import { More } from "../../../src/screens/More";

export default function MoreTab() {
  const shell = useShell();
  return <More onOpenPage={(key) => router.push(`/page/${key}`)} onSignOut={shell.signOut} />;
}
