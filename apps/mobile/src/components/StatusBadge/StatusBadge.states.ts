import type { StatusBadgeProps } from "./StatusBadge";

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const statusBadgeStates = {
  neutral: { label: "Left out of net worth" },
  info: { label: "Calculated", tone: "info" },
} satisfies Record<string, StatusBadgeProps>;
