import { cva } from "@repo/ui/styled-system/css";

export const breakdownGrid = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", lg: "repeat(2, minmax(0, 1fr))" },
    gap: { base: "16px", md: "24px" },
    alignItems: "start",
  },
});

export const cardTitle = cva({
  base: { textStyle: "heading.md", color: "text.primary", margin: 0 },
});

export const cardSubtitle = cva({
  base: { textStyle: "body.sm", color: "text.muted", margin: 0, marginTop: "2px" },
});

export const cardBody = cva({
  base: { display: "flex", flexDirection: "column", gap: "16px" },
});

export const donutFrame = cva({
  base: { position: "relative", width: "100%", height: "220px" },
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
    gap: "8px",
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

export const emptyNote = cva({
  base: { textStyle: "body.sm", color: "text.muted", textAlign: "center", paddingY: "40px" },
});

export const categoryList = cva({
  base: { display: "flex", flexDirection: "column", gap: "8px" },
});

export const categoryRow = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    width: "100%",
    padding: "12px 16px",
    borderRadius: "lg",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    backgroundColor: "surface.card",
    color: "text.primary",
    textAlign: "left",
    cursor: "pointer",
    transition: "border-color 0.15s ease, background-color 0.15s ease",
    _hover: { borderColor: "primary.border", backgroundColor: "surface.subtle" },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
});

export const categoryIdentity = cva({
  base: { display: "flex", alignItems: "center", gap: "12px", minWidth: 0 },
});

export const categoryIconTile = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "36px",
    height: "36px",
    borderRadius: "md",
    backgroundColor: "primary.subtle",
    color: "primary",
    flexShrink: 0,
  },
});

export const categoryName = cva({
  base: { textStyle: "label.md", color: "text.primary", margin: 0 },
});

export const categoryCount = cva({
  base: { textStyle: "body.sm", color: "text.muted", margin: 0 },
});

export const categoryAmount = cva({
  base: { display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 },
});

export const perMonth = cva({
  base: { textStyle: "label.sm", color: "text.muted", fontVariantNumeric: "tabular-nums" },
});

export const dataTable = cva({
  base: {
    fontVariantNumeric: "tabular-nums",
    "& td, & th": { fontVariantNumeric: "tabular-nums" },
  },
});
