import { cva } from "@repo/ui/styled-system/css";

export const sectionsRegion = cva({
  base: { display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 },
});

export const sectionHeading = cva({
  base: { textStyle: "heading.md", color: "text.primary", margin: 0 },
});

export const widgetGrid = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))" },
    alignItems: "stretch",
    gap: { base: "12px", md: "20px" },
    minWidth: 0,
  },
});

export const showHideButton = cva({
  base: { gap: "8px" },
});

/** Setup and check-in rows sit close together so they read as one group (law of proximity). */
export const housekeepingGroup = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    minWidth: 0,
    _empty: { display: "none" },
  },
});
