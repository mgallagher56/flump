import { cva } from "@repo/ui/styled-system/css";

export const pageRoot = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "page.section",
    width: "100%",
    minWidth: 0,
    paddingBottom: { base: "6", md: "12" },
    // The header holds the tax year controls on the h1's row under `md` (see headerActions).
    "& > :first-child": { position: "relative" },
    // No page-wide tabular-nums: Inter's tnum feature also widens the hyphen, so words such as
    // "Self-employed" read "Self - employed". Each figure sets tabular-nums itself (Money, KPI).
  },
});

export const numeric = cva({
  base: { fontVariantNumeric: "tabular-nums" },
});

export const drawers = cva({
  base: { display: "flex", flexDirection: "column", gap: "2", minWidth: 0 },
});

/**
 * The tax year select and the year's menu, in the header's actions slot. Under `md` the slot sits
 * on the h1's row, top right (the header is the page's first child), so it does not push the
 * hero down; the select's "Tax year" label is then for screen readers only.
 */
export const headerActions = cva({
  base: {
    display: "flex",
    alignItems: "center",
    gap: "2",
    position: { base: "absolute", md: "static" },
    top: "0",
    right: "0",
  },
});

/** The year's menu beside the select, from `md`. */
export const wideOnly = cva({
  base: { display: { base: "none", md: "inline-flex" } },
});

/**
 * Under `md`, the year's delete action at the foot of the records, lined up with the table's
 * left edge (the ghost button's own padding is taken back).
 */
export const narrowOnly = cva({
  base: {
    display: { base: "inline-flex", md: "none" },
    alignSelf: "flex-start",
    marginTop: "3",
    marginInlineStart: "-4",
    fontVariantNumeric: "tabular-nums",
  },
});

export const errorText = cva({
  base: { textStyle: "body.sm", color: "text.primary", margin: 0 },
});
