import type { EmptyStateProps } from "./EmptyState";

const noop = () => {};

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const emptyStateStates = {
  noAccounts: {
    title: "No accounts yet",
    description: "Add a current account, savings or pension and your totals will appear here.",
    actions: [{ label: "Add an account on the website", onPress: noop, variant: "link" }],
  },
  twoActions: {
    title: "No monthly balances yet",
    description:
      "Record this month's balances to start your history. You can add earlier months too.",
    actions: [
      { label: "Start monthly check-in", onPress: noop },
      { label: "Add earlier months on the website", onPress: noop, variant: "link" },
    ],
  },
  noAction: {
    title: "No balance history yet",
    description: "Record this account's balance each month and its history shows here.",
  },
} satisfies Record<string, EmptyStateProps>;
