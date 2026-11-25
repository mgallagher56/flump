import type { CurrencyInputProps } from "./CurrencyInput";

const ignore = () => undefined;

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const currencyInputStates = {
  empty: { value: null, onValueChange: ignore, accessibilityLabel: "Current account balance" },
  withPence: {
    value: 1204.5,
    onValueChange: ignore,
    accessibilityLabel: "Current account balance",
  },
  wholePounds: { value: 185000, onValueChange: ignore, accessibilityLabel: "Mortgage balance" },
  notEditable: {
    value: 900,
    onValueChange: ignore,
    accessibilityLabel: "Savings balance",
    editable: false,
  },
} satisfies Record<string, CurrencyInputProps>;
