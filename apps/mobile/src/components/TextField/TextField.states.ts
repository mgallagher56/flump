import type { TextFieldProps } from "./TextField";

const noop = () => {};

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const textFieldStates = {
  filled: { value: "Sam", onChangeText: noop, accessibilityLabel: "First name" },
  empty: { value: "", onChangeText: noop, accessibilityLabel: "Last name" },
  disabled: { value: "Sam", onChangeText: noop, accessibilityLabel: "First name", editable: false },
} satisfies Record<string, TextFieldProps>;
