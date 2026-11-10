import { cva } from "../../../styled-system/css";

export const buttonRecipe = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    rounded: "md",
    fontWeight: "semibold",
    transition: "all 0.15s ease",
    cursor: "pointer",
    lineHeight: "1",
    textDecoration: "none",
    _disabled: {
      opacity: 0.5,
      cursor: "not-allowed",
    },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
  variants: {
    variant: {
      primary: {
        bg: "primary",
        color: "primary.foreground",
        _hover: { bg: "primary.hover" },
      },
      secondary: {
        bg: "surface.subtle",
        color: "text.primary",
        borderWidth: "1px",
        borderColor: "border",
        _hover: { bg: "surface.sunken", borderColor: "border.strong" },
      },
      outline: {
        bg: "transparent",
        color: "text.primary",
        borderWidth: "1px",
        borderColor: "border",
        _hover: { bg: "surface.subtle", borderColor: "border.strong" },
      },
      ghost: {
        bg: "transparent",
        color: "text.primary",
        _hover: { bg: "surface.subtle" },
      },
      link: {
        bg: "transparent",
        color: "primary",
        textUnderlineOffset: "4px",
        _hover: { textDecoration: "underline" },
        height: "auto",
        px: "0",
        py: "0",
      },
      destructive: {
        bg: "status.danger.solid",
        color: "text.onContrast",
        _hover: { opacity: 0.9 },
      },
    },
    size: {
      sm: { px: "3", py: "2", fontSize: "xs", minH: "8" },
      md: { px: "4", py: "2.5", fontSize: "sm", minH: "10" },
      lg: { px: "6", py: "3", fontSize: "md", minH: "12" },
      icon: { h: "10", w: "10", px: "0" },
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "md",
  },
});
