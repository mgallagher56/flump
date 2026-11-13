import { cva } from "@repo/ui/styled-system/css";

export const calculatorRoot = cva({
  base: { display: "flex", flexDirection: "column", gap: { base: "24px", md: "32px" } },
});

export const section = cva({
  base: { display: "flex", flexDirection: "column", gap: "16px" },
});

export const sectionTitle = cva({
  base: { textStyle: "heading.lg", color: "text.primary", margin: 0 },
});

export const heroSubtext = cva({
  base: {
    display: "inline-flex",
    alignItems: "baseline",
    gap: "6px",
    flexWrap: "wrap",
    fontVariantNumeric: "tabular-nums",
  },
});

export const estimateNote = cva({
  base: { marginTop: "-8px" },
});

export const resultsStack = cva({
  base: { display: "flex", flexDirection: "column", gap: "16px" },
});

export const emptyResults = cva({
  base: { textStyle: "body.md", color: "text.secondary", margin: 0 },
});

export const footer = cva({
  base: { display: "flex", alignItems: "center", gap: "6px" },
});

export const zoneLink = cva({
  base: {
    textStyle: "label.md",
    color: "primary",
    textDecoration: "underline",
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
});
