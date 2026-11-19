import { cva } from "../../../styled-system/css";

/**
 * A phone at large text: narrower than 20em (375px at 200% text is about 11.7em; 320px at default
 * text is exactly 20em, so it does not match). See PageHeader.styles.ts.
 */
const LARGE_TEXT_PHONE = "@media screen and (max-width: 19.99em)";

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
    // The side insets keep the end items clear of the notch on a phone held sideways (P15).
    paddingLeft: "max(token(spacing.1), env(safe-area-inset-left))",
    paddingRight: "max(token(spacing.1), env(safe-area-inset-right))",
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
    // Every item fills its slot, the "More" button too: a <button> shrinks to its content where a
    // link fills the cell, so More was 30px wide beside 73px links. About 62px at 320, 73px at 375.
    width: "100%",
    boxSizing: "border-box",
    px: "0",
    // Button defaults off, so a button item draws exactly like a link item.
    margin: "0",
    borderWidth: "0",
    backgroundColor: "transparent",
    fontFamily: "inherit",
    cursor: "pointer",
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
    // At large text the label alone names the page: the icon goes and the item keeps to the 44px
    // touch height, so the bar does not take a quarter of the screen (phone audit P19).
    [LARGE_TEXT_PHONE]: {
      minH: "touch",
      "& > :first-child:not([data-nav-label])": { display: "none" },
    },
  },
});

export const mobileBottomBarLabel = cva({
  base: {
    maxWidth: "100%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    // At large text a label wraps to two lines (hyphenated where a word is too long for its slot)
    // instead of being cut to "Acc…" (phone audit P19).
    [LARGE_TEXT_PHONE]: {
      whiteSpace: "normal",
      hyphens: "auto",
      overflowWrap: "anywhere",
      lineClamp: "2",
      lineHeight: "tight",
    },
  },
});
