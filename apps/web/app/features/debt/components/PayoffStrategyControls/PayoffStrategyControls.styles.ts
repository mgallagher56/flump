import { css, cva } from "@repo/ui/styled-system/css";

export const strategyContainer = cva({
  base: {
    backgroundColor: "surface.card",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    p: { base: "16px", md: "20px" },
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    boxShadow: "card",
  },
});

export const strategyCard = cva({
  base: {
    p: "14px",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    backgroundColor: "surface.card",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    cursor: "pointer",
    transition: "all 0.15s ease",
    _hover: {
      borderColor: "border.strong",
    },
  },
  variants: {
    active: {
      true: {
        borderWidth: "2px",
        borderColor: "primary",
        backgroundColor: "primary.subtle",
      },
    },
  },
});

export const strategyHeading = css({
  fontFamily: "display",
  fontSize: "md",
  fontWeight: "bold",
  color: "text.primary",
  margin: "0",
});

export const strategySubheading = css({ fontSize: "xs", color: "text.muted", mt: "2px", mb: "0" });

export const impactRow = css({
  backgroundColor: "primary.subtle",
  p: "10px 14px",
  borderRadius: "lg",
  borderWidth: "1px",
  borderStyle: "dashed",
  borderColor: "primary.border",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "8px",
  fontVariantNumeric: "tabular-nums",
});

export const impactTitle = css({ fontSize: "xs", fontWeight: "semibold", color: "text.primary" });

export const strategyGrid = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", sm: "repeat(2, 1fr)" },
  gap: "12px",
});

export const strategyCardTitle = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  fontWeight: "bold",
  fontSize: "xs",
  color: "text.primary",
  textAlign: "left",
});

export const strategyCardHint = css({ fontSize: "xs", color: "text.muted", textAlign: "left" });
