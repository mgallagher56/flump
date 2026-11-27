import type { DateFieldProps } from "./DateField";

const ignore = () => undefined;

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const dateFieldStates = {
  empty: { label: "Opened on", value: "", onValueChange: ignore },
  filled: { label: "Opened on", value: "2021-03-27", onValueChange: ignore },
  clearable: {
    label: "Fixed rate ends",
    value: "2028-02-29",
    onValueChange: ignore,
    clearable: true,
  },
  notEditable: {
    label: "Fixed rate ends",
    value: "2027-06-01",
    onValueChange: ignore,
    clearable: true,
    editable: false,
  },
} satisfies Record<string, DateFieldProps>;
