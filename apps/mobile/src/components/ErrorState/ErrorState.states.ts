import type { ErrorStateProps } from "./ErrorState";

const noop = () => {};

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const errorStateStates = {
  loadFailed: {
    heading: "We could not load your accounts",
    body: "Nothing has changed. Check your connection and try again.",
    onRetry: noop,
  },
  ownLabel: {
    heading: "We could not reach Flump",
    body: "Check your connection and try again.",
    retryLabel: "Check again",
    onRetry: noop,
  },
} satisfies Record<string, ErrorStateProps>;
