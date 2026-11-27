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
