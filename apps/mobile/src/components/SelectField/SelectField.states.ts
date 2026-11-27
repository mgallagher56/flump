import type { SelectFieldProps } from "./SelectField";

const noop = () => {};

const PLANS = [
  { value: "plan1", label: "Plan 1" },
  { value: "plan2", label: "Plan 2" },
  { value: "plan4", label: "Plan 4" },
  { value: "plan5", label: "Plan 5" },
  { value: "postgrad", label: "Postgraduate loan" },
] as const;

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const selectFieldStates = {
  ownership: {
    label: "Ownership",
    options: [
      { value: "sole", label: "Just me" },
      { value: "joint", label: "Joint" },
    ],
    value: "sole",
    onChange: noop,
  },
  plan: { label: "Repayment plan", options: PLANS, value: "postgrad", onChange: noop },
  notEditable: {
    label: "Repayment plan",
    options: PLANS,
    value: "plan2",
    onChange: noop,
    editable: false,
  },
} satisfies Record<string, SelectFieldProps<string>>;
