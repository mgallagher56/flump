import { TABS } from "../../../src/navigation/navItems";
import { ComingSoon } from "../../../src/screens/ComingSoon";

const tab = TABS.find((t) => t.key === "taxAndPay");

/** Pay: on the website until its own slice (plan 9.1). */
export default function PayTab() {
  return tab?.webRoute ? <ComingSoon label={tab.label} webRoute={tab.webRoute} /> : null;
}
