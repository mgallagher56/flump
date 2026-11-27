import type { MoneyProps } from "./Money";

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const moneyStates = {
  default: { value: 1204.5 },
  debt: { value: -23500 },
  notSet: { value: null },
  zero: { value: 0 },
  small: { value: 87, size: "sm", color: "secondary" },
  kpi: { value: 1800, size: "kpi" },
  large: { value: 125000, size: "lg" },
  muted: { value: 640, color: "muted" },
} satisfies Record<string, MoneyProps>;
