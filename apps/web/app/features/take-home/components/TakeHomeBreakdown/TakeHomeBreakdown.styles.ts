import { cva } from "@repo/ui/styled-system/css";

export const cardBody = cva({
  base: { display: "flex", flexDirection: "column", gap: "24px" },
});

export const cardTitle = cva({
  base: { textStyle: "heading.md", color: "text.primary", margin: 0 },
});

export const cardSubtitle = cva({
  base: { textStyle: "body.sm", color: "text.muted", margin: 0, marginTop: "2px" },
});

export const chartRow = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", md: "minmax(0, 1fr) minmax(0, 1.2fr)" },
    gap: "24px",
    alignItems: "center",
  },
});

export const donutFrame = cva({
  base: { position: "relative", width: "100%", height: "200px" },
});

export const donutCentre = cva({
  base: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
  },
});

export const donutCentreLabel = cva({
  base: { textStyle: "label.sm", color: "text.muted" },
});

export const legend = cva({
  base: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
});

export const legendRow = cva({
  base: {
    display: "grid",
    gridTemplateColumns: "auto 1fr auto auto",
    alignItems: "center",
    gap: "10px",
    textStyle: "body.sm",
    color: "text.secondary",
  },
});

export const legendShare = cva({
  base: {
    textStyle: "label.sm",
    color: "text.muted",
    fontVariantNumeric: "tabular-nums",
    minWidth: "40px",
    textAlign: "right",
  },
});

// Keeps all three columns inside a 375px card: tighter cell padding, and the label wraps.
export const compactTable = cva({
  base: {
    "& th, & td": { paddingX: { base: "8px", md: "14px" } },
    "& th:first-child, & td:first-child": { whiteSpace: "normal" },
  },
});

export const totalCell = cva({
  base: { fontWeight: "semibold", color: "text.primary" },
});
