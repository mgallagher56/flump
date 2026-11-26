import type { ListRowProps } from "./ListRow";

const noop = () => {};

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const listRowStates = {
  page: { label: "Pension", icon: "coins", onPress: noop },
  longLabel: { label: "Savings and pension", icon: "piggy-bank", onPress: noop },
  action: { label: "Sign out", icon: "log-out", onPress: noop, accessibilityRole: "button" },
} satisfies Record<string, ListRowProps>;
