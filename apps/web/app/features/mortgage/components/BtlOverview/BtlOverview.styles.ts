import { cva } from "@repo/ui/styled-system/css";

export const btlCard = cva({
  base: {
    backgroundColor: "surface.card",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    p: { base: "16px", md: "20px" },
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    minWidth: 0,
  },
});

export const btlHeader = cva({
  base: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px",
  },
});

export const btlTitleRow = cva({
  base: { display: "flex", alignItems: "center", gap: "10px", color: "text.primary" },
});

export const btlTitle = cva({
  base: { textStyle: "heading.sm", margin: 0, color: "text.primary" },
});

export const btlSubtitle = cva({
  base: {
    textStyle: "body.sm",
    color: "text.muted",
    margin: 0,
    fontVariantNumeric: "tabular-nums",
  },
});

export const noteRow = cva({
  base: {
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
    textStyle: "body.sm",
    color: "text.muted",
  },
});

export const noteIcon = cva({
  base: { color: "status.info.text", marginTop: "2px", flexShrink: 0 },
});
