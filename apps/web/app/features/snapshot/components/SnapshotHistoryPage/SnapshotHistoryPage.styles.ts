import { cva } from "@repo/ui/styled-system/css";

export const page = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: { base: "16px", md: "24px" },
    width: "100%",
    maxWidth: "1200px",
    marginX: "auto",
    paddingX: { base: "16px", md: "24px" },
    paddingY: { base: "16px", md: "24px" },
    minWidth: 0,
  },
});

export const actionsRow = cva({
  base: { display: "flex", flexWrap: "wrap", gap: "8px" },
});

export const savedLine = cva({
  base: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "8px",
    margin: 0,
    textStyle: "body.sm",
    color: "text.secondary",
    fontVariantNumeric: "tabular-nums",
  },
});

export const sectionStack = cva({
  base: { display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 },
});

export const changeSentence = cva({
  base: {
    margin: 0,
    textStyle: "body.lg",
    color: "text.primary",
    fontVariantNumeric: "tabular-nums",
  },
});

export const factList = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", sm: "1fr 1fr" },
    gap: "16px",
    margin: 0,
  },
});

export const factLabel = cva({
  base: { margin: 0, textStyle: "body.sm", color: "text.secondary" },
});

export const factValue = cva({
  base: {
    margin: 0,
    marginTop: "4px",
    textStyle: "numeric.md",
    color: "text.primary",
    fontVariantNumeric: "tabular-nums",
  },
});

export const sectionHeading = cva({
  base: { margin: 0, textStyle: "heading.md", color: "text.primary" },
});
