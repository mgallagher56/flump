import { cva } from "@repo/ui/styled-system/css";

/** The section is a link target (#settings-age-and-pay), so it clears the sticky header. */
export const ageAndPayAnchor = cva({
  base: { scrollMarginTop: "24" },
});

/** Figures in the fields and the age line line up as numbers. */
export const numericField = cva({
  base: { fontVariantNumeric: "tabular-nums" },
});

/** The "% of salary" / "£ a month" switch: a full-width row above the two contribution fields. */
export const pensionUnitRow = cva({
  base: {
    gridColumn: "1 / -1",
    // Stacked, so the tabs get the row's full width. `Tabs` contains its own inline size, so in a
    // content-sized flex item (the old wrapping row) it measured 0 wide and did not show.
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    gap: "2",
  },
});

export const pensionUnitLabel = cva({
  base: { textStyle: "body.sm", fontWeight: "medium", color: "text.primary", margin: 0 },
});

export const pensionUnitNote = cva({
  base: { textStyle: "body.sm", color: "text.muted", margin: 0 },
});

export const pensionLinkRow = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "baseline",
    gap: "1",
    textStyle: "body.sm",
    color: "text.secondary",
    margin: 0,
  },
});
