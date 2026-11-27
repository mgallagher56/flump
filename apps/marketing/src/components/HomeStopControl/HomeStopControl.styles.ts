import { css, cva } from "@repo/ui/styled-system/css";

/* From 30rem (480px), as prototype 11: the roomier control and the stop's name. */

/** One frosted pill: the section nav, and anything set beside it (the motion control). */
const pill = {
  display: "flex",
  alignItems: "center",
  gap: "0.5",
  padding: "0.5",
  "@media (min-width: 30rem)": { gap: "1", padding: "1" },
  borderRadius: "full",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "border",
  backgroundColor: "color-mix(in srgb, token(colors.surface.card) 94%, transparent)",
  backdropFilter: "blur(10px)",
  boxShadow: "raised",
} as const;

/**
 * Fixed at the bottom left, inside the safe area (R5). While the page scrolls it steps out of the
 * way (a short fade and drop), never while it holds focus or the pointer is on it (a control that
 * is visible must take a click: after a click focus moves to the stop's heading, and the pointer
 * still on the control keeps it); with reduced motion it simply hides and returns. The page gives its footer room for it (HomePage `pageShell`), so it never covers the
 * last lines.
 */
export const dock = css({
  position: "fixed",
  left: "2",
  bottom: "calc(token(spacing.2) + env(safe-area-inset-bottom, 0px))",
  "@media (min-width: 30rem)": {
    left: "3",
    bottom: "calc(token(spacing.3) + env(safe-area-inset-bottom, 0px))",
  },
  zIndex: "banner",
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "2",
  transitionProperty: "opacity, translate",
  transitionDuration: "base",
  transitionTimingFunction: "standard",
  "& [data-motion-control]": { ...pill, px: "1" },
  // The motion control beside the nav: a full 44px target. Under 30rem the dock has no room for
  // its words beside the count, so it is an icon button there; its words stay in the page, out of
  // sight, as its accessible name ("Pause animation", WCAG 4.1.2), and with no visible words
  // there is no visible label for that name to differ from (WCAG 2.5.3).
  "& [data-motion-control] button": { height: "11" },
  "@media (max-width: 29.99rem)": {
    "& [data-motion-control] button": { width: "11", px: "0", justifyContent: "center" },
    "& [data-motion-label]": { srOnly: true },
  },
  "&[data-scrolling]:not(:focus-within):not(:hover)": {
    opacity: 0,
    pointerEvents: "none",
    _motionSafe: { translate: "0 token(spacing.3)" },
  },
});

export const nav = css(pill);

/** Real 44px buttons at every width; the next button wears the mint circle. */
export const button = cva({
  base: {
    display: "grid",
    placeItems: "center",
    width: "11",
    height: "11",
    borderRadius: "full",
    borderWidth: 0,
    cursor: "pointer",
    transitionProperty: "background-color",
    transitionDuration: "fast",
    transitionTimingFunction: "standard",
    _disabled: { opacity: 0.4, cursor: "default" },
    _focusVisible: {
      outlineWidth: "2px",
      outlineStyle: "solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
  variants: {
    next: {
      false: {
        backgroundColor: "transparent",
        color: "text.primary",
        "&:hover:not(:disabled)": { backgroundColor: "surface.subtle" },
      },
      true: {
        // The filled circle, as prototype 11: teal in light, mint in dark. Its icon clears 6.3:1
        // in light and about 10:1 in dark (allow-listed in architecture.laws.test.ts).
        backgroundColor: "primary",
        color: "primary.foreground",
        "&:hover:not(:disabled)": { backgroundColor: "primary.emphasis" },
      },
    },
  },
});

export const label = css({
  margin: 0,
  px: "1",
  "@media (min-width: 30rem)": { px: "2" },
  textStyle: "label.sm",
  color: "text.primary",
  whiteSpace: "nowrap",
  fontVariantNumeric: "tabular-nums",
});

export const count = css({ color: "text.secondary", fontVariantNumeric: "tabular-nums" });

/** The stop's name: hidden on the narrowest phones, where the count alone fits. */
export const nameText = css({
  display: "none",
  "@media (min-width: 30rem)": { display: "inline" },
});
