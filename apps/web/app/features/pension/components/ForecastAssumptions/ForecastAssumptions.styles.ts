import { cva } from "@repo/ui/styled-system/css";

export const assumptionsPanel = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    margin: 0,
    minWidth: 0,
    padding: { base: "16px", md: "20px" },
    backgroundColor: "surface.card",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
  },
});

export const assumptionsLegend = cva({
  base: { padding: 0, textStyle: "heading.sm", color: "text.primary" },
});

export const toggleRow = cva({
  base: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    textStyle: "body.md",
    color: "text.primary",
    cursor: "pointer",
    minHeight: "44px",
    "& input": { marginTop: "4px", width: "18px", height: "18px", accentColor: "primary.solid" },
  },
});

export const toggleHint = cva({
  base: {
    display: "block",
    textStyle: "body.sm",
    color: "text.muted",
    fontVariantNumeric: "tabular-nums",
  },
});

export const savedFacts = cva({
  base: {
    margin: 0,
    padding: 0,
    listStyle: "none",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    textStyle: "body.sm",
    color: "text.secondary",
  },
});
