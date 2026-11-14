import { cva } from "@repo/ui/styled-system/css";

export const tableBlock = cva({
  base: { display: "flex", flexDirection: "column", gap: "8px", minWidth: 0 },
});

export const tableNote = cva({
  base: {
    margin: 0,
    textStyle: "body.sm",
    color: "text.secondary",
    fontVariantNumeric: "tabular-nums",
  },
});

/**
 * On the table element. Headers (account names and months) wrap, so the three columns fit at 375
 * and the change column stays in view; figures keep `nowrap` from `Td numeric`. The table is a
 * positioned box, so the visually hidden caption and spoken changes (absolutely positioned) stay
 * inside its scroll box and never widen the page.
 */
export const changeTable = cva({
  base: {
    position: "relative",
    "& th": { whiteSpace: "normal", overflowWrap: "break-word" },
  },
});

/**
 * The earlier month's column: hidden on phones so the account table keeps three columns and never
 * stacks into labelled cards. The change column still says how far each account moved.
 */
export const wideOnly = cva({
  base: { display: { base: "none", md: "table-cell" } },
});

/** Neutral ink in both directions: the sign carries the meaning, not a colour (advice policy R1). */
export const changeCell = cva({
  base: { color: "text.primary", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" },
});
