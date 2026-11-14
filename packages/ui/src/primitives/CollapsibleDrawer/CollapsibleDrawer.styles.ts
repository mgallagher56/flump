import { cva } from "../../../styled-system/css";

export const drawerContainer = cva({
  base: {
    borderRadius: "2xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border",
    backgroundColor: "surface.card",
    overflow: "hidden",
  },
});

export const drawerHeaderButton = cva({
  base: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "4",
    p: { base: "14px 16px", md: "16px 20px" },
    minHeight: "touch",
    backgroundColor: "transparent",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
    color: "text.primary",
    _motionSafe: { transition: "background-color token(durations.fast) token(easings.standard)" },
    _hover: {
      backgroundColor: "surface.subtle",
    },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "-2px",
    },
  },
});

export const drawerTitleRow = cva({
  base: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: "2" },
});

export const drawerTitle = cva({
  base: { textStyle: "label.md", fontWeight: "semibold", color: "text.primary" },
});

export const drawerSubtitle = cva({
  base: {
    textStyle: "body.sm",
    color: "text.muted",
    mt: "0.5",
    mb: "0",
    fontVariantNumeric: "tabular-nums",
  },
});

export const drawerCount = cva({
  base: { textStyle: "body.sm", color: "text.secondary", fontVariantNumeric: "tabular-nums" },
});

export const drawerAction = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "1",
    flexShrink: 0,
    textStyle: "label.sm",
    fontWeight: "semibold",
    color: "primary",
  },
});

export const drawerChevron = cva({
  base: {
    display: "inline-flex",
    _motionSafe: { transition: "transform token(durations.base) token(easings.standard)" },
  },
  variants: {
    open: { true: { transform: "rotate(180deg)" }, false: {} },
  },
  defaultVariants: { open: false },
});

export const drawerBody = cva({
  base: {
    p: { base: "16px", md: "20px" },
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "border.subtle",
    backgroundColor: "surface.card",
    overflowX: "auto",
    fontVariantNumeric: "tabular-nums",
    _motionSafe: {
      animationName: "fadeIn",
      animationDuration: "base",
      animationTimingFunction: "enter",
    },
  },
});

// Quiet variant: a text button with no card chrome (plan P10.5, "Show data", "Show details").
export const drawerQuietContainer = cva({
  base: { display: "flex", flexDirection: "column", alignItems: "flex-start", width: "100%" },
});

export const drawerQuietButton = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "1.5",
    minHeight: "touch",
    px: "1",
    mx: "-1",
    backgroundColor: "transparent",
    border: "none",
    borderRadius: "md",
    cursor: "pointer",
    textStyle: "label.sm",
    fontWeight: "semibold",
    color: "primary",
    textDecoration: "none",
    _hover: { textDecoration: "underline", textUnderlineOffset: "3px" },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
});

export const drawerQuietBody = cva({
  base: {
    width: "100%",
    pt: "2",
    overflowX: "auto",
    fontVariantNumeric: "tabular-nums",
    _motionSafe: {
      animationName: "fadeIn",
      animationDuration: "base",
      animationTimingFunction: "enter",
    },
  },
});
