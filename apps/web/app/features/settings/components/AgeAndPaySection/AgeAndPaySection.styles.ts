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
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "2",
  },
});

export const pensionUnitLabel = cva({
  base: { textStyle: "body.sm", fontWeight: "medium", color: "text.primary", margin: 0 },
});

export const pensionUnitNote = cva({
  base: { flexBasis: "100%", textStyle: "body.sm", color: "text.muted", margin: 0 },
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
