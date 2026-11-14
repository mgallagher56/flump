import { cva } from "../../../styled-system/css";

export const mobileBottomBarRoot = cva({
  base: {
    display: { base: "block", lg: "none" },
    position: "fixed",
    bottom: "0",
    left: "0",
    right: "0",
    zIndex: "header",
    backgroundColor: "color-mix(in srgb, token(colors.surface.card) 94%, transparent)",
    backdropFilter: "blur(14px)",
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "border",
    paddingTop: "1.5",
    paddingX: "2",
    paddingBottom: "calc(6px + env(safe-area-inset-bottom))",
  },
});

export const mobileBottomBarList = cva({
  base: {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    gap: "1",
    listStyle: "none",
    padding: "0",
    margin: "0",
  },
});

export const mobileBottomBarLink = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5",
    minH: "12",
    px: "1",
    borderRadius: "full",
    color: "text.secondary",
    textStyle: "label.sm",
    fontWeight: "semibold",
    textDecoration: "none",
    textAlign: "center",
    _motionSafe: {
      transitionProperty: "background-color, color",
      transitionDuration: "fast",
      transitionTimingFunction: "standard",
    },
    _hover: { color: "text.primary" },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "-2px",
    },
    '&[aria-current="page"]': { backgroundColor: "primary.subtle", color: "primary" },
  },
});

export const mobileBottomBarLabel = cva({
  base: { maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
});
