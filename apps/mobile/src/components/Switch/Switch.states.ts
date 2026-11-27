import type { SwitchProps } from "./Switch";

const noop = () => {};

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const switchStates = {
  on: {
    label: "Count property you own, less the mortgage on it",
    value: true,
    onValueChange: noop,
  },
  off: { label: "Count your student loan as a debt", value: false, onValueChange: noop },
  withHint: {
    label: "Self Assessment",
    hint: "Income and expense records by tax year, for self-employed or rental income.",
    value: false,
    onValueChange: noop,
  },
  busyOn: { label: "Self Assessment", value: true, busy: true, onValueChange: noop },
  busyOff: { label: "Self Assessment", value: false, busy: true, onValueChange: noop },
  disabledOn: { label: "Self Assessment", value: true, disabled: true, onValueChange: noop },
  disabledOff: { label: "Self Assessment", value: false, disabled: true, onValueChange: noop },
} satisfies Record<string, SwitchProps>;
