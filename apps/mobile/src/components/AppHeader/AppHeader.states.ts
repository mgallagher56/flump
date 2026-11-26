import type { AppHeaderProps } from "./AppHeader";

const noop = () => {};

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const appHeaderStates = {
  withMenu: { title: "Accounts", onOpenMenu: noop },
  more: { title: "More" },
  longTitle: { title: "Savings and pension", onOpenMenu: noop },
  stacked: { title: "Pension", onBack: noop },
} satisfies Record<string, AppHeaderProps>;
