import { cva } from "@repo/ui/styled-system/css";

export const pageShell = cva({
  base: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "surface.canvas",
  },
});

export const mainContent = cva({
  base: { flex: "1", px: "4", py: { base: "12", md: "16" }, _focus: { outline: "none" } },
});

/** The reading width shared by pricing, security, MCP and contact (E16 PR 12 round 2). */
export const container = cva({
  base: { maxWidth: "3xl", mx: "auto", display: "flex", flexDirection: "column", gap: "8" },
});

export const headerBlock = cva({
  base: { display: "flex", flexDirection: "column", gap: "3" },
});

export const heading = cva({
  base: { textStyle: "heading.xl", color: "text.primary", margin: 0 },
});

export const intro = cva({
  base: { textStyle: "body.lg", color: "text.secondary", margin: 0 },
});

export const planCard = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "5",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "primary.border",
    backgroundColor: "surface.card",
    boxShadow: "card",
    p: { base: "6", md: "8" },
  },
});

export const planName = cva({
  base: { textStyle: "heading.lg", color: "text.primary", margin: 0 },
});

export const featureList = cva({
  base: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: "3",
  },
});

export const featureItem = cva({
  base: {
    display: "flex",
    alignItems: "flex-start",
    gap: "3",
    textStyle: "body.md",
    color: "text.primary",
  },
});

export const featureIcon = cva({
  base: { color: "primary", flexShrink: 0, mt: "0.5", display: "inline-flex" },
});

/** The possible paid plan: one quiet line, no card chrome to fill (D10 b). */
export const paidLine = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "baseline",
    columnGap: "3",
    rowGap: "1",
    px: { base: "4", md: "5" },
    py: "4",
    borderRadius: "lg",
    backgroundColor: "surface.subtle",
    textStyle: "body.md",
    color: "text.secondary",
  },
});

export const paidName = cva({
  base: { textStyle: "heading.sm", color: "text.primary", margin: 0 },
});

export const paidPrice = cva({
  base: {
    color: "text.muted",
    fontVariantNumeric: "tabular-nums",
    pl: "3",
    borderLeftWidth: "1px",
    borderLeftStyle: "solid",
    borderLeftColor: "border",
  },
});

export const paidNote = cva({
  base: { margin: 0, flexBasis: { base: "100%", md: "auto" } },
});
