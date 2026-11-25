import type { InlineAlertProps } from "./InlineAlert";

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const inlineAlertStates = {
  danger: { message: "Sign-in did not finish. Try again." },
  info: { message: "We could not reach Flump. Check your connection and try again.", tone: "info" },
} satisfies Record<string, InlineAlertProps>;
