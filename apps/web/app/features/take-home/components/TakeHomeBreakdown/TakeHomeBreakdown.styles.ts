import { cva } from "@repo/ui/styled-system/css";

export const cardBody = cva({
  base: { display: "flex", flexDirection: "column", gap: "16px" },
});

export const cardHeader = cva({
  base: { display: "flex", flexDirection: "column", gap: "4px" },
});

export const cardTitle = cva({
  base: { textStyle: "heading.md", color: "text.primary", margin: 0 },
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
 * answer, the rest recede.
 */
export const segment = cva({
  variants: {
    part: {
      takeHome: { fill: "chart.primary" },
      taxAndNi: { fill: "chart.series8" },
      pensionAndLoan: { fill: "chart.baseline" },
    },
  },
});

/** Two labels under the bar's two ends; the right one wraps onto a second line on a phone. */
export const barLabels = cva({
  base: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr)",
    alignItems: "start",
    gap: "16px",
    marginTop: "8px",
  },
});

export const barLabel = cva({
  base: { textStyle: "body.sm", color: "text.secondary" },
  variants: {
    tone: {
      takeHome: { color: "text.primary", fontWeight: "semibold" },
    },
    end: { true: { textAlign: "right" } },
  },
});

export const drawerBody = cva({
  base: { display: "flex", flexDirection: "column", gap: "16px" },
});

export const takeHomeRow = cva({
  base: { "& th, & td": { fontWeight: "bold", color: "text.primary" } },
});
