import type { PercentInputProps } from "./PercentInput";

const ignore = () => undefined;

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const percentInputStates = {
  empty: { value: null, onValueChange: ignore, accessibilityLabel: "Interest rate" },
  rate: { value: 4.75, onValueChange: ignore, accessibilityLabel: "Interest rate" },
  share: { value: 50, onValueChange: ignore, accessibilityLabel: "Your share", decimals: 0 },
  notEditable: {
    value: 3.2,
    onValueChange: ignore,
    accessibilityLabel: "Interest rate",
    editable: false,
  },
} satisfies Record<string, PercentInputProps>;
