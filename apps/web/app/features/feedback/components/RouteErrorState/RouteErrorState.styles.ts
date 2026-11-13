import { cva } from "@repo/ui/styled-system/css";

export const errorStateContainer = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "12px",
    maxWidth: "560px",
    width: "100%",
    marginX: "auto",
    p: { base: "20px", md: "28px" },
    backgroundColor: "surface.card",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "status.danger.border",
    boxShadow: "card",
  },
});

export const errorStateBadge = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    px: "10px",
    py: "4px",
    borderRadius: "full",
    fontSize: "xs",
    fontWeight: "semibold",
    backgroundColor: "status.danger.bg",
    color: "status.danger.text",
  },
});

export const errorStateHeading = cva({
  base: {
    margin: 0,
    fontFamily: "display",
    fontSize: "xl",
    fontWeight: "bold",
    color: "text.primary",
    _focus: { outline: "none" },
  },
});

export const errorStateIllustration = cva({
  base: { display: "flex", justifyContent: "flex-start", width: "100%" },
});

export const errorStateStatus = cva({
  base: {
    margin: 0,
    fontSize: "xs",
    color: "text.muted",
    fontVariantNumeric: "tabular-nums",
  },
});

export const errorStateBody = cva({
  base: {
    margin: 0,
    fontSize: "sm",
    lineHeight: "1.5",
    color: "text.secondary",
  },
});

export const errorStateActions = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "12px",
    marginTop: "8px",
  },
});

export const errorStateReport = cva({
  base: {
    fontSize: "sm",
    color: "primary",
    textDecoration: "underline",
    textUnderlineOffset: "2px",
    _hover: { color: "primary.hover" },
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
});
