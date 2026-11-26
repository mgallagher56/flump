import { TABS } from "../../../src/navigation/navItems";
import { ComingSoon } from "../../../src/screens/ComingSoon";

const tab = TABS.find((t) => t.key === "accounts");

/** Accounts: on the website until its own slice (plan 9.1). */
export default function AccountsTab() {
  return tab?.webRoute ? <ComingSoon label={tab.label} webRoute={tab.webRoute} /> : null;
}
