import type { ToastProps } from "./Toast";

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const toastStates = {
  saved: { message: "Saved your October balances." },
  hidden: { message: null },
} satisfies Record<string, ToastProps>;
