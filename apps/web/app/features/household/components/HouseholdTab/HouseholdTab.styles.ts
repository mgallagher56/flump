import { cva } from "@repo/ui/styled-system/css";

export const householdTabStack = cva({
  base: { display: "flex", flexDirection: "column", gap: "page.section", minWidth: 0 },
});

/** Who the household is with: the first thing the tab says. */
export const householdStatus = cva({
  base: { textStyle: "body.md", color: "text.primary", margin: 0 },
});

export const householdCard = cva({
  base: { display: "flex", flexDirection: "column", gap: "4", minWidth: 0 },
});
