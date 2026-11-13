import { cva } from "@repo/ui/styled-system/css";

export const widgetContent = cva({
  base: { display: "flex", flexDirection: "column", gap: "12px", minWidth: 0 },
});

export const detailList = cva({
  base: { display: "flex", flexDirection: "column", margin: 0, padding: 0 },
});

export const detailRow = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: "4px 12px",
    paddingY: "8px",
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "border.subtle",
  },
});

export const detailLabel = cva({
  base: { textStyle: "body.sm", color: "text.secondary", margin: 0 },
});

export const detailValue = cva({
  base: {
    textStyle: "label.md",
    color: "text.primary",
    margin: 0,
    fontVariantNumeric: "tabular-nums",
    display: "inline-flex",
    flexWrap: "wrap",
    alignItems: "baseline",
    gap: "4px",
  },
});

export const detailNote = cva({
  base: {
    textStyle: "body.sm",
    color: "text.muted",
    margin: 0,
    flexBasis: "100%",
    fontVariantNumeric: "tabular-nums",
  },
});

export const actionLink = cva({
  base: {
    textStyle: "label.md",
    color: "primary",
    textDecoration: "underline",
    textUnderlineOffset: "3px",
    _hover: { textDecoration: "none" },
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
});
