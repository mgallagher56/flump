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

export const assumptionNote = cva({
  base: { margin: 0, textStyle: "body.sm", color: "text.muted" },
});

export const marginalBlock = cva({
  base: { display: "flex", flexDirection: "column", gap: "8px", minWidth: 0 },
});

export const marginalTitle = cva({
  base: { textStyle: "label.md", color: "text.primary", margin: 0 },
});

export const marginalBadges = cva({
  base: { display: "flex", flexWrap: "wrap", gap: "6px" },
});

export const marginalLink = cva({
  base: {
    alignSelf: "flex-start",
    textStyle: "label.md",
    color: "primary",
    textDecoration: "underline",
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
});
