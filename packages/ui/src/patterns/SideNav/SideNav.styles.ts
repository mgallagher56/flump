import { cva } from "../../../styled-system/css";

export const sideNavRoot = cva({
  base: { display: "flex", flexDirection: "column", gap: "4", width: "100%" },
});

export const sideNavList = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "1",
    listStyle: "none",
    padding: "0",
    margin: "0",
  },
});

export const sideNavGroupHeading = cva({
  base: {
    textStyle: "label.sm",
    color: "text.muted",
    textTransform: "uppercase",
    letterSpacing: "wider",
    px: "3",
    pt: "3",
    pb: "1",
    margin: "0",
  },
});

export const sideNavLink = cva({
  base: {
    display: "flex",
    alignItems: "center",
    gap: "3",
    minH: "10",
    px: "3",
    borderRadius: "control",
    color: "text.secondary",
    textStyle: "label.md",
    fontWeight: "semibold",
    textDecoration: "none",
    cursor: "pointer",
    _motionSafe: {
      transitionProperty: "background-color, color",
      transitionDuration: "fast",
      transitionTimingFunction: "standard",
    },
    _hover: { backgroundColor: "surface.sunken", color: "text.primary" },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
    '&[aria-current="page"]': { backgroundColor: "primary.subtle", color: "primary" },
  },
});

export const sideNavLabelGroup = cva({
  base: { display: "flex", flexDirection: "column", flex: "1", minWidth: 0 },
});

export const sideNavDescription = cva({
  base: { textStyle: "body.sm", color: "text.secondary", fontWeight: "normal" },
});

export const sideNavBadge = cva({
  base: {
    textStyle: "label.sm",
    fontVariantNumeric: "tabular-nums",
    color: "text.secondary",
    backgroundColor: "surface.sunken",
    borderRadius: "full",
    px: "2",
    marginLeft: "auto",
  },
});
