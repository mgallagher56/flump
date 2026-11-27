import type { WholeNumberInputProps } from "./WholeNumberInput";

const ignore = () => undefined;

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const wholeNumberInputStates = {
  empty: { value: null, onValueChange: ignore, accessibilityLabel: "Years left" },
  years: { value: 25, onValueChange: ignore, accessibilityLabel: "Years left", suffix: "years" },
  months: { value: 0, onValueChange: ignore, accessibilityLabel: "Months left", suffix: "months" },
  notEditable: {
    value: 12,
    onValueChange: ignore,
    accessibilityLabel: "Years left",
    suffix: "years",
    editable: false,
  },
} satisfies Record<string, WholeNumberInputProps>;
