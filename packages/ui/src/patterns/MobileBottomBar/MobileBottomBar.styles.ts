import { cva } from "../../../styled-system/css";

export const mobileBottomBarRoot = cva({
  base: {
    // Phones only: from the shared nav breakpoint (768px) the desktop navigation shows instead.
    display: { base: "block", _navInline: "none" },
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
    // Tight sides and no slot gap so every label fits whole at 320px (about 62px a slot); labels
    // are never truncated (owner ruling 2026-11-14).
    paddingX: "1",
    paddingBottom: "calc(6px + env(safe-area-inset-bottom))",
  },
});

export const mobileBottomBarList = cva({
  base: {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    gap: "0",
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
    // The whole slot is the label's width: about 62px at 320, 73px at 375.
    px: "0",
    borderRadius: "full",
    color: "text.secondary",
    textStyle: "label.sm",
    fontWeight: "semibold",
    textDecoration: "none",
    textAlign: "center",
    // Hover, and its fade, only where a pointer can really hover. The current fill changes at once:
    // it used to fade out over `fast`, so a frame taken just after leaving Budget for Mortgage still
    // showed Budget filled although it was no longer current; and a touch browser keeps `:hover` on
    // the last tab tapped, so that tab looked darker on the next page.
    "@media (hover: hover)": {
      _motionSafe: {
        transitionProperty: "color",
        transitionDuration: "fast",
        transitionTimingFunction: "standard",
      },
      _hover: { color: "text.primary" },
    },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "-2px",
    },
    '&[aria-current="page"]': { backgroundColor: "primary.subtle", color: "primary" },
    // Anything after the label (the sandbox's lock icon) sits beside the item icon as a badge,
    // not in a row under the label, so every label shares one baseline (RESCORE B7). The label
    // carries `data-nav-label`, so this does not depend on whether the item has an icon.
    "& > [data-nav-label] ~ *": {
      position: "absolute",
      insetBlockStart: "1",
      insetInlineStart: "calc(50% + 0.75rem)",
      color: "text.muted",
    },
  },
});

export const mobileBottomBarLabel = cva({
  base: { maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
});
