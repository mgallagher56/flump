import { TABS } from "../../navigation/navItems";
import type { TabBarProps } from "./TabBar";

const noop = () => {};

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const tabBarStates = {
  home: { items: TABS, activeKey: "home", onSelect: noop },
  accounts: { items: TABS, activeKey: "accounts", onSelect: noop },
  more: { items: TABS, activeKey: "more", onSelect: noop },
} satisfies Record<string, TabBarProps>;
