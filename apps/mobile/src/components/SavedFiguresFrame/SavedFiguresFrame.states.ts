import type { SavedFiguresFrameProps } from "./SavedFiguresFrame";

/** A fixed "now" for the gallery and tests: 27 November 2026, 12:00 UTC. */
export const FRAME_NOW = Date.UTC(2026, 10, 27, 12, 0, 0);

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const savedFiguresFrameStates = {
  /** Online: the screen alone, no notice. */
  online: { savedAt: null, now: FRAME_NOW, checking: false, onTryAgain: () => {} },
  justNow: { savedAt: FRAME_NOW - 20_000, now: FRAME_NOW, checking: false, onTryAgain: () => {} },
  hoursAgo: {
    savedAt: FRAME_NOW - 2 * 3_600_000,
    now: FRAME_NOW,
    checking: false,
    onTryAgain: () => {},
  },
  daysAgo: {
    savedAt: FRAME_NOW - 3 * 86_400_000,
    now: FRAME_NOW,
    checking: false,
    onTryAgain: () => {},
  },
  checking: {
    savedAt: FRAME_NOW - 2 * 3_600_000,
    now: FRAME_NOW,
    checking: true,
    onTryAgain: () => {},
  },
} satisfies Record<string, SavedFiguresFrameProps>;
