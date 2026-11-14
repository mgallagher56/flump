import { cva } from "@repo/ui/styled-system/css";

export const effectRoot = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "3",
    fontVariantNumeric: "tabular-nums",
    minWidth: "0",
  },
});

export const effectNote = cva({
  base: { textStyle: "body.sm", color: "text.secondary", margin: "0" },
});

export const effectLink = cva({
  base: {
    color: "primary",
    textDecoration: "underline",
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
});

export const outcomeLabel = cva({
  base: {
    margin: 0,
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "2",
    textStyle: "body.sm",
    color: "text.secondary",
  },
});

export const outcomeValue = cva({
  base: {
    margin: 0,
    textStyle: "numeric.kpi",
    fontVariantNumeric: "tabular-nums",
    color: "text.primary",
  },
});

export const outcomeSupport = cva({
  base: { display: "flex", flexWrap: "wrap", gap: "6", margin: 0, mt: "2" },
});

export const outcomeSupportItem = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5",
    textStyle: "body.sm",
    color: "text.secondary",
    "& dd": {
      margin: 0,
      textStyle: "body.md",
      color: "text.primary",
      fontVariantNumeric: "tabular-nums",
    },
  },
});

export const outcomeSuffix = cva({
  base: { textStyle: "body.md", color: "text.secondary", whiteSpace: "nowrap" },
});
