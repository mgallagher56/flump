import { cva } from "@repo/ui/styled-system/css";

/**
 * The page renders through `PageBody` (R2-9). The header and the tabs sit closer than PageBody's
 * section gap, since the tabs are the page's own content, not a new section (R3).
 */
export const headerAndTabs = cva({
  base: { display: "flex", flexDirection: "column", gap: "6", minWidth: 0 },
});
