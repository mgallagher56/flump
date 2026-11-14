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
    borderColor: "border",
    boxShadow: "card",
  },
});

export const errorStateHeading = cva({
  base: {
    margin: 0,
    // The marketing 404's heading style, so both sites' not-found cards read the same (R2-9).
    textStyle: "heading.lg",
    color: "text.primary",
    // Focus lands here by script so screen readers announce what happened; the heading is not a
    // control, so it draws no focus ring.
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
