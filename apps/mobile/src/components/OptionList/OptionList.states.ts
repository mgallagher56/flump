import type { OptionListProps } from "./OptionList";

const noop = () => {};

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const optionListStates = {
  theme: {
    label: "Colour theme",
    hint: "System follows your phone's setting.",
    options: [
      { value: "system", label: "System" },
      { value: "light", label: "Light" },
      { value: "dark", label: "Dark" },
    ],
    value: "system",
    onChange: noop,
  },
  days: {
    label: "Check-in day",
    options: [
      { value: "1", label: "1st" },
      { value: "2", label: "2nd" },
      { value: "3", label: "3rd" },
    ],
    value: "2",
    onChange: noop,
  },
  saving: {
    label: "Check-in day",
    options: [
      { value: "1", label: "1st" },
      { value: "2", label: "2nd" },
    ],
    value: "1",
    busy: true,
    onChange: noop,
  },
} satisfies Record<string, OptionListProps<string>>;
