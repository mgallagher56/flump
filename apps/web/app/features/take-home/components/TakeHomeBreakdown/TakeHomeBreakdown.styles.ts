import { cva } from "@repo/ui/styled-system/css";

export const cardBody = cva({
  base: { display: "flex", flexDirection: "column", gap: "12px", minWidth: 0 },
});

export const cardTitle = cva({
  base: { textStyle: "heading.sm", color: "text.primary", margin: 0 },
});

export const bar = cva({
  base: {
    display: "block",
    height: "12px",
    width: "100%",
    borderRadius: "full",
    overflow: "hidden",
    backgroundColor: "surface.sunken",
  },
});

/**
 * Teal for take-home pay, two quiet neutrals for what comes off (P9.3): one hue carries the
 * answer, the rest recede. The two neutrals differ in lightness so each segment reads on its own.
 */
const partFill = {
  takeHome: { fill: "chart.primary" },
  taxAndNi: { fill: "chart.series8" },
  pensionAndLoan: { fill: "border.strong" },
} as const;

const partBackground = {
  takeHome: { backgroundColor: "chart.primary" },
  taxAndNi: { backgroundColor: "chart.series8" },
  pensionAndLoan: { backgroundColor: "border.strong" },
} as const;

export const segment = cva({ variants: { part: partFill } });

/** The segment's colour beside its label. */
export const swatch = cva({
  base: {
    display: "inline-block",
    width: "10px",
    height: "10px",
    borderRadius: "full",
    flexShrink: 0,
    // Forced colours drop background fills, so outline each swatch to keep it visible.
    "@media (forced-colors: active)": { border: "1px solid CanvasText" },
  },
  variants: { part: partBackground },
});

/** One label per segment: a row from `sm`, stacked on a phone. */
export const barLabels = cva({
  base: {
    display: "flex",
    flexDirection: { base: "column", sm: "row" },
    flexWrap: "wrap",
    gap: { base: "4px", sm: "8px 24px" },
    margin: 0,
    marginTop: "12px",
    padding: 0,
    listStyle: "none",
  },
});

export const barLabel = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    textStyle: "body.sm",
    color: "text.secondary",
  },
  variants: {
    tone: {
      takeHome: { color: "text.primary", fontWeight: "semibold" },
    },
  },
});
export const drawerBody = cva({
  base: { display: "flex", flexDirection: "column", gap: "16px" },
});

export const takeHomeRow = cva({
  base: { "& th, & td": { fontWeight: "bold", color: "text.primary" } },
});
