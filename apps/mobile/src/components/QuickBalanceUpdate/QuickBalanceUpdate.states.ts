import type { QuickBalanceUpdateProps } from "./QuickBalanceUpdate";

const saved = async () => null;

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const quickBalanceUpdateStates = {
  balance: { accountName: "Holiday fund", owed: false, current: 1250, onSave: saved },
  owed: { accountName: "Credit card", owed: true, current: 480.5, onSave: saved },
  joint: {
    accountName: "Joint savings",
    owed: false,
    current: 8000,
    hint: "This is the whole balance. Your share is 50% of it.",
    onSave: saved,
  },
} satisfies Record<string, QuickBalanceUpdateProps>;
