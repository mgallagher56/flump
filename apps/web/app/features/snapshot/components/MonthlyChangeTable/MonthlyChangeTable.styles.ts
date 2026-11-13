import { cva } from "@repo/ui/styled-system/css";

export const tableCard = cva({
  base: { display: "flex", flexDirection: "column", gap: "8px", minWidth: 0 },
});

export const tableHeading = cva({
  base: { margin: 0, textStyle: "heading.sm", color: "text.primary" },
});

export const tableNote = cva({
  base: {
    margin: 0,
    textStyle: "body.sm",
    color: "text.secondary",
    fontVariantNumeric: "tabular-nums",
  },
});

/** Neutral ink in both directions: the sign carries the meaning, not a colour (advice policy R1). */
export const changeCell = cva({
  base: { color: "text.primary", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" },
});
