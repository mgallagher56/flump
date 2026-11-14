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
    gap: "0.5",
    listStyle: "none",
    padding: "0",
    margin: "0",
  },
});

export const mobileBottomBarLink = cva({
  base: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5",
    minH: "12",
    // The whole slot is the label's width: at 375 a slot is about 68px (R2-2, label fit).
    px: "0.5",
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
    // A third child (the sandbox's lock icon after the label) sits beside the item icon as a
    // badge, not in a row under the label, so every label shares one baseline (RESCORE B7).
    "& > :nth-child(3)": {
      position: "absolute",
      insetBlockStart: "1",
      insetInlineStart: "calc(50% + 0.5rem)",
      color: "text.muted",
    },
  },
});

export const mobileBottomBarLabel = cva({
  base: { maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
});
