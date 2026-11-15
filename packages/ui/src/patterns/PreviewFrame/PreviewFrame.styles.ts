import { cva } from "../../../styled-system/css";

/**
 * Product preview frame (PR A): accessible frame wrapping live illustrative previews.
 * Marked as an example household with sample figures.
 */
export const previewFrame = cva({
  base: {
    width: "100%",
    maxWidth: "4xl",
    mx: "auto",
    textAlign: "left",
    backgroundColor: "surface.card",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    borderRadius: "2xl",
    boxShadow: "card",
    p: { base: "4", md: "6" },
    display: "flex",
    flexDirection: "column",
    gap: "4",
  },
});

export const previewHeader = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "3",
  },
});

export const previewTitleGroup = cva({
  base: {
    display: "flex",
    alignItems: "center",
    gap: "2.5",
    flexWrap: "wrap",
  },
});

export const previewTitle = cva({
  base: {
    textStyle: "heading.sm",
    color: "text.primary",
    margin: 0,
    fontWeight: "semibold",
  },
});

export const previewSwitcher = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    m: "0",
    p: "0.5",
    borderRadius: "lg",
    backgroundColor: "surface.sunken",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    gap: "1",
  },
});

export const previewSwitchButton = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    px: "3",
    py: "1",
    borderRadius: "md",
    textStyle: "label.sm",
    fontWeight: "medium",
    cursor: "pointer",
    transitionProperty: "background-color, color",
    transitionDuration: "fast",
    transitionTimingFunction: "standard",
    border: "none",
    color: "text.secondary",
    backgroundColor: "transparent",
    _hover: {
      color: "text.primary",
    },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "1px",
    },
  },
  variants: {
    active: {
      true: {
        backgroundColor: "surface.card",
        color: "text.primary",
        boxShadow: "xs",
      },
      false: {},
    },
  },
  defaultVariants: {
    active: false,
  },
});

export const previewContent = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "4",
    minWidth: "0",
    width: "100%",
  },
});

export const previewCaption = cva({
  base: {
    textStyle: "body.sm",
    color: "text.secondary",
    margin: 0,
    fontVariantNumeric: "tabular-nums",
  },
});
