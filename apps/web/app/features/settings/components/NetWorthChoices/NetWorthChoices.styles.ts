import { cva } from "@repo/ui/styled-system/css";

/** The two switches, stacked, with room between them. */
export const choiceList = cva({
  base: { display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 },
});

/** The section is a link target (#net-worth), so it clears the sticky header when scrolled to. */
export const choicesAnchor = cva({
  base: { scrollMarginTop: "96px" },
});
