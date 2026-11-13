import { cva } from "@repo/ui/styled-system/css";

export const teaserCard = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", md: "repeat(12, minmax(0, 1fr))" },
    gap: { base: "6", md: "8" },
    alignItems: "start",
  },
});

export const teaserControls = cva({
  base: {
    gridColumn: { base: "auto", md: "span 5" },
    display: "flex",
    flexDirection: "column",
    gap: "6",
  },
});

export const teaserOutcome = cva({
  base: {
    gridColumn: { base: "auto", md: "span 7" },
    display: "flex",
    flexDirection: "column",
    gap: "4",
    padding: { base: "5", md: "6" },
    borderRadius: "xl",
    backgroundColor: "surface.sunken",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
  },
});

export const outcomeLabel = cva({
  base: {
    fontSize: "xs",
    fontWeight: "semibold",
    letterSpacing: "0.01em",
    color: "text.secondary",
  },
});

export const outcomeHeadline = cva({
  base: {
    fontFamily: "display",
    fontSize: { base: "2xl", md: "3xl" },
    fontWeight: "bold",
    lineHeight: "1.2",
    color: "text.primary",
    margin: "0",
    fontVariantNumeric: "tabular-nums",
  },
});

export const outcomeSub = cva({
  base: {
    fontSize: "sm",
    color: "text.secondary",
    margin: "0",
    fontVariantNumeric: "tabular-nums",
  },
});

export const breakdownList = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    margin: "0",
  },
});

export const breakdownRow = cva({
  base: {
    display: "flex",
    justifyContent: "space-between",
    gap: "4",
    paddingY: "2",
    fontSize: "sm",
    borderBottomWidth: "1px",
    borderBottomStyle: "dashed",
    borderBottomColor: "border.subtle",
  },
});

export const breakdownTerm = cva({
  base: { color: "text.secondary" },
});

export const breakdownValue = cva({
  base: {
    margin: "0",
    fontWeight: "semibold",
    color: "text.primary",
    fontVariantNumeric: "tabular-nums",
  },
});

export const teaserFootnote = cva({
  base: {
    fontSize: "xs",
    lineHeight: "1.6",
    color: "text.muted",
    margin: "0",
  },
});

export const teaserButton = cva({
  base: {
    width: "100%",
    display: "inline-flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "2",
  },
});
