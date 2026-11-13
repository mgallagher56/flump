import { cva } from "../../../styled-system/css";

export const inlineAlertRecipe = cva({
  base: {
    display: "flex",
    alignItems: "flex-start",
    gap: "3",
    borderWidth: "1px",
    borderStyle: "solid",
    color: "text.primary",
    paddingBlock: "3",
    paddingInline: "4",
    fontSize: "sm",
    lineHeight: "1.5",
  },
  variants: {
    tone: {
      info: { backgroundColor: "status.info.bg", borderColor: "status.info.border" },
      positive: { backgroundColor: "status.positive.bg", borderColor: "status.positive.border" },
      warning: { backgroundColor: "status.warning.bg", borderColor: "status.warning.border" },
      danger: { backgroundColor: "status.danger.bg", borderColor: "status.danger.border" },
      neutral: { backgroundColor: "status.neutral.bg", borderColor: "status.neutral.border" },
    },
    layout: {
      inline: { borderRadius: "xl" },
      // Full-width band: edge to edge, no side borders or rounding.
      banner: {
        width: "100%",
        borderRadius: "none",
        borderLeftWidth: "0",
        borderRightWidth: "0",
        paddingInline: { base: "4", md: "6" },
      },
    },
  },
  defaultVariants: { tone: "info", layout: "inline" },
});

export const inlineAlertIconRecipe = cva({
  base: { flexShrink: 0, display: "inline-flex", marginTop: "0.5" },
  variants: {
    tone: {
      info: { color: "status.info.text" },
      positive: { color: "status.positive.text" },
      warning: { color: "status.warning.text" },
      danger: { color: "status.danger.text" },
      neutral: { color: "status.neutral.text" },
    },
  },
  defaultVariants: { tone: "info" },
});

export const inlineAlertBody = cva({
  base: { flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "1" },
});

export const inlineAlertTitle = cva({
  base: { margin: "0", fontWeight: "semibold", color: "text.primary" },
});

export const inlineAlertText = cva({
  base: { margin: "0", color: "text.secondary" },
});

export const inlineAlertActionRecipe = cva({
  base: { marginTop: "1", display: "flex", flexWrap: "wrap", gap: "2" },
});

export const inlineAlertDismissRecipe = cva({
  base: {
    flexShrink: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "44px",
    height: "44px",
    marginBlock: "-3",
    marginInlineEnd: "-3",
    borderRadius: "md",
    border: "none",
    backgroundColor: "transparent",
    color: "text.secondary",
    cursor: "pointer",
    _hover: { backgroundColor: "surface.subtle", color: "text.primary" },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
});
