import { cva } from "@repo/ui/styled-system/css";

export const root = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "4",
    minWidth: 0,
    fontVariantNumeric: "tabular-nums",
  },
});

export const title = cva({
  base: { textStyle: "heading.sm", color: "text.primary", margin: 0 },
});

export const intro = cva({
  base: { textStyle: "body.sm", color: "text.secondary", margin: 0, marginTop: "1" },
});

export const groupRow = cva({
  base: {
    "& th, & td": {
      backgroundColor: "surface.sunken",
      textStyle: "label.md",
      color: "text.primary",
      fontWeight: "semibold",
    },
  },
});

export const indent = cva({
  base: {
    paddingLeft: "6",
    textStyle: "body.sm",
    color: "text.secondary",
    textAlign: "left",
    whiteSpace: "normal",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "border.subtle",
  },
});

export const totalRow = cva({
  base: { "& th, & td": { fontWeight: "semibold", color: "text.primary" } },
});

export const selectedCol = cva({
  base: { backgroundColor: "primary.subtle" },
});
