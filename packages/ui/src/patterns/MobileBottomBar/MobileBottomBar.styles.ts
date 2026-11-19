import { cva } from "../../../styled-system/css";

/**
 * A phone at large text: the bar is narrower than 20rem (375px at 200% text is about 11.7rem;
 * 320px at default text is exactly 20rem, so it does not match). A container query on the bar, not
 * an em media query: rem in a container query follows the root font size (browser text zoom and a
 * root `font-size: 200%`), where an em media query never sees it (phone sweep 4).
 */
const LARGE_TEXT_PHONE = "@container bottom-bar (max-width: 19.99rem)";

export const mobileBottomBarRoot = cva({
  base: {
    // Phones only: from the shared nav breakpoint (768px) the desktop navigation shows instead.
    display: { base: "block", _navInline: "none" },
    position: "fixed",
    bottom: "0",
    left: "0",
    right: "0",
    zIndex: "header",
    // The bar is fixed to both sides, so its width never depends on its items (LARGE_TEXT_PHONE).
    containerType: "inline-size",
    containerName: "bottom-bar",
    backgroundColor: "color-mix(in srgb, token(colors.surface.card) 94%, transparent)",
    backdropFilter: "blur(14px)",
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "border",
    paddingTop: "1.5",
    // Tight sides and no slot gap so every label fits whole at 320px (about 62px a slot); labels
    // are never truncated (owner ruling 2026-11-14).
    // The side insets keep the end items clear of the notch on a phone held sideways (P15).
    // 0.25rem (4px at default text), not the px spacing token: Chrome re-checks a container query
    // only when the container's size changes, so a padding that follows the root font size makes a
    // text-size change re-check LARGE_TEXT_PHONE (phone sweep 4).
    paddingLeft: "max(0.25rem, env(safe-area-inset-left))",
    paddingRight: "max(0.25rem, env(safe-area-inset-right))",
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
