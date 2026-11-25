import type { SkeletonProps } from "./Skeleton";

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const skeletonStates = {
  default: { label: "Loading your accounts" },
  oneLine: { label: "Loading your balance", lines: 1 },
  long: { label: "Loading your check-in", lines: 5 },
} satisfies Record<string, SkeletonProps>;
