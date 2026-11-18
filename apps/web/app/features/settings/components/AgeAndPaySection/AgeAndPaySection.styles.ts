import { cva } from "@repo/ui/styled-system/css";

/** The section is a link target (#settings-age-and-pay), so it clears the sticky header. */
export const ageAndPayAnchor = cva({
  base: { scrollMarginTop: "24" },
});

/** Figures in the fields and the age line line up as numbers. */
export const numericField = cva({
  base: { fontVariantNumeric: "tabular-nums" },
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
