import { cva } from "@repo/ui/styled-system/css";

export const row = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "12px",
    paddingX: "16px",
    paddingY: "12px",
    minWidth: 0,
    backgroundColor: "surface.card",
    borderRadius: "card",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border",
  },
});

export const rowIcon = cva({
  base: { display: "inline-flex", color: "text.secondary", flexShrink: 0 },
});

export const rowText = cva({
  base: {
    flex: "1 1 240px",
    minWidth: 0,
    textStyle: "body.sm",
    color: "text.secondary",
    fontVariantNumeric: "tabular-nums",
    "& p": { margin: 0 },
  },
});

export const rowTitle = cva({
  base: { margin: 0, textStyle: "label.md", color: "text.primary" },
});
