import type { DataListProps } from "./DataList";

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const dataListStates = {
  months: {
    caption: "Balance by month",
    rows: [
      { id: "2026-09", label: "September 2026", figure: "£187,100" },
      { id: "2026-10", label: "October 2026", figure: "£186,550", note: "Calculated" },
      { id: "2026-11", label: "November 2026", figure: "£186,000", note: "Saved balance" },
    ],
  },
  changes: {
    rows: [
      { id: "a", label: "Current account", figure: "+£20", spoken: "up £20" },
      { id: "b", label: "Credit card (owed)", figure: "+£35", spoken: "up £35", note: "Confirmed" },
      { id: "c", label: "Workplace pension", figure: "−£260", spoken: "down £260" },
    ],
  },
} satisfies Record<string, DataListProps>;
