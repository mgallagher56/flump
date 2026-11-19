import { cva } from "@repo/ui/styled-system/css";

/**
 * The page renders through `PageBody` (R2-9). The header and the tabs sit closer than PageBody's
 * section gap, since the tabs are the page's own content, not a new section (R3). The space above
 * the tabs matches the tab panel's own space below them (16px), and PageHeader's bottom margin
 * does not stack on the gap (P37).
 */
export const headerAndTabs = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "4",
    minWidth: 0,
    "& > header": { marginBottom: "0" },
  },
});
