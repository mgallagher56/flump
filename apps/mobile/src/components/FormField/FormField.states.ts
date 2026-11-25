import { createElement } from "react";
import { CurrencyInput } from "../CurrencyInput";
import type { FormFieldProps } from "./FormField";

// A .ts file (the native file set), so the element is made without JSX.
const input = (label: string, value: number | null) =>
  createElement(CurrencyInput, {
    value,
    onValueChange: () => undefined,
    accessibilityLabel: label,
  });

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const formFieldStates = {
  default: { label: "Current account", children: input("Current account", 1204.5) },
  withHint: {
    label: "Mortgage",
    hint: "The balance on your latest statement.",
    children: input("Mortgage", null),
  },
  withError: {
    label: "Savings",
    hint: "The balance on your latest statement.",
    error: "Enter an amount in pounds, like 1,204.50.",
    children: input("Savings", null),
  },
} satisfies Record<string, FormFieldProps>;
