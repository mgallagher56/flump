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
 * way (a short fade and drop), never while it holds focus; with reduced motion it simply hides and
 * returns. The page gives its footer room for it (HomePage `pageShell`), so it never covers the
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
  "&[data-scrolling]:not(:focus-within)": {
    opacity: 0,
    pointerEvents: "none",
    _motionSafe: { translate: "0 token(spacing.3)" },
  },
});

export const nav = css(pill);

/** Real 44px buttons (40px on a narrow phone); the next button wears the mint circle. */
export const button = cva({
  base: {
    display: "grid",
    placeItems: "center",
    width: "10",
    height: "10",
    "@media (min-width: 30rem)": { width: "11", height: "11" },
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
