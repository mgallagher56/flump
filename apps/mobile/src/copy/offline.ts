/**
 * The words around saved figures shown offline (E12 S7). Neutral, en-GB, and true: the time is
 * when Flump last sent them, never when the app opened.
 */
export const SAVED_FIGURES = {
  /** `when` from `formatRelativeTime`: "just now", "2 hours ago", "yesterday". */
  lastUpdated: (when: string) => `You are offline. These figures were last updated ${when}.`,
  changes: "Changes need a connection.",
  tryAgain: "Try again",
} as const;

/**
 * On a form left open when the connection drops (E12 S7 follow-up): what was typed stays, and Save
 * works again once Flump answers. No blame and no alarm.
 */
export const SAVE_NEEDS_CONNECTION =
  "Saving needs a connection. What you typed stays here, so you can save it once you are back online.";
