import { cva } from "../../../styled-system/css";

export const topBarRoot = cva({
  base: {
    position: "sticky",
    top: "0",
    zIndex: "header",
    width: "100%",
    backgroundColor: "color-mix(in srgb, token(colors.surface.canvas) 88%, transparent)",
    backdropFilter: "blur(14px)",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "border.subtle",
  },
});

export const topBarInner = cva({
  base: {
    display: "flex",
    alignItems: "center",
    gap: { base: "3", _navInline: "5" },
    minHeight: { base: "14", _navInline: "18" },
    px: { base: "4", _navInline: "10" },
    py: "2",
    maxWidth: "1536px",
    marginX: "auto",
  },
});

export const topBarLogo = cva({
  base: { display: "inline-flex", alignItems: "center", flexShrink: 0 },
});

export const topBarMenuButton = cva({
  base: { display: { base: "inline-flex", _navInline: "none" } },
});

export const topBarNav = cva({
  base: {
    display: { base: "none", _navInline: "block" },
    flex: "1",
    minWidth: 0,
    marginLeft: "3",
  },
});

export const topBarList = cva({
  base: {
    display: "flex",
    alignItems: "center",
    gap: "1",
    flexWrap: "nowrap",
    listStyle: "none",
    padding: "0",
    margin: "0",
  },
});

export const topBarNavItem = cva({
  base: { position: "relative", flexShrink: 0 },
});

export const topBarLink = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "2",
    minH: "8",
    px: "3",
    borderRadius: "full",
    backgroundColor: "transparent",
    borderWidth: "0",
    color: "text.secondary",
    textStyle: "label.md",
    fontWeight: "semibold",
    whiteSpace: "nowrap",
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

export const topBarBadge = cva({
  base: {
    textStyle: "label.sm",
    fontVariantNumeric: "tabular-nums",
    color: "text.secondary",
    backgroundColor: "surface.sunken",
    borderRadius: "full",
    px: "2",
  },
});

export const topBarFlyout = cva({
  base: {
    position: "absolute",
    top: "100%",
    left: "0",
    mt: "2",
    minWidth: "260px",
    zIndex: "dropdown",
    display: "flex",
    flexDirection: "column",
    gap: "1",
    padding: "2",
    backgroundColor: "surface.overlay",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.DEFAULT",
    borderRadius: "card",
    boxShadow: "overlay",
  },
});

export const topBarFlyoutLink = cva({
  base: {
    display: "flex",
    alignItems: "flex-start",
    gap: "3",
    padding: "2",
    px: "3",
    borderRadius: "control",
    color: "text.primary",
    textDecoration: "none",
    _hover: { backgroundColor: "surface.sunken" },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "-2px",
    },
    '&[aria-current="page"]': { backgroundColor: "primary.subtle", color: "primary" },
  },
});

export const topBarFlyoutText = cva({
  base: { display: "flex", flexDirection: "column", gap: "0.5" },
});

export const topBarFlyoutLabel = cva({
  base: { textStyle: "label.md", fontWeight: "semibold" },
});

export const topBarFlyoutDescription = cva({
  base: { textStyle: "body.sm", color: "text.secondary" },
});

export const topBarActions = cva({
  base: { display: "flex", alignItems: "center", gap: "3", marginLeft: "auto", flexShrink: 0 },
});

export const topBarInlineActions = cva({
  base: { display: { base: "none", _navInline: "flex" }, alignItems: "center", gap: "3" },
});
