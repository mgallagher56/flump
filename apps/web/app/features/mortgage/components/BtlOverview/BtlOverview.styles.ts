import { cva } from "@repo/ui/styled-system/css";

export const btlCard = cva({
  base: {
    backgroundColor: "surface.card",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border",
    boxShadow: "card",
    p: { base: "16px", md: "20px" },
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    minWidth: 0,
    fontVariantNumeric: "tabular-nums",
  },
});

export const btlHeader = cva({
  base: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: "12px",
  },
});

export const btlTitle = cva({
  base: { textStyle: "heading.md", color: "text.primary", margin: 0 },
});

export const btlSubtitle = cva({
  base: {
    textStyle: "body.sm",
    color: "text.secondary",
    margin: 0,
    marginTop: "2px",
    fontVariantNumeric: "tabular-nums",
  },
});
