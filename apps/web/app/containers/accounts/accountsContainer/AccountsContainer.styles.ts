import { cva } from "@repo/ui/styled-system/css";

export const headerActions = cva({
  base: { display: "flex", alignItems: "center", gap: "12px" },
});

/** The header's secondary action shows from md; a phone header holds one action (R2-5). */
export const wideOnly = cva({
  base: { display: { base: "none", md: "inline-flex" } },
});

/** On a phone the check-in button sits under the totals instead of in the header. */
export const phoneOnly = cva({
  base: { display: { base: "flex", md: "none" }, flexDirection: "column", minWidth: 0 },
});

export const emptyWrap = cva({
  base: { display: "flex", justifyContent: "center", minWidth: 0 },
});
