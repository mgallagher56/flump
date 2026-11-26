import { TABS } from "../../../src/navigation/navItems";
import { ComingSoon } from "../../../src/screens/ComingSoon";

const tab = TABS.find((t) => t.key === "budget");

/** Budget: on the website until its own slice (plan 9.1). */
export default function BudgetTab() {
  return tab?.webRoute ? (
    <ComingSoon pageKey={tab.key} label={tab.label} webRoute={tab.webRoute} />
  ) : null;
}
