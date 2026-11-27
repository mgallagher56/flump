import { css, cva } from "@repo/ui/styled-system/css";

/** The band: positioned, and its own stacking context, so the bubble layer sits under the content. */
export const featuresBand = css({ position: "relative", isolation: "isolate" });

/** Under everything in the band, above the band's own fill (MK8: never over text). */
export const bubbleLayer = css({ position: "absolute", inset: 0, zIndex: -1 });

export const strip = css({ display: "flex", flexDirection: "column", gap: "2" });

/**
 * The six tiles. Below `lg` they run sideways in one row that scrolls natively (scroll-snap, no
 * script needed, MK1), each width showing a peek of the next tile. From `lg` a plain three-column
 * grid, nothing hidden to the side, so the controls hide themselves.
 */
export const featureList = css({
  listStyle: "none",
  margin: 0,
  display: "grid",
  gridAutoFlow: "column",
  gridAutoColumns: { base: "min(82%, 20rem)", md: "min(42%, 22rem)" },
  gap: { base: "4", md: "5" },
  overflowX: "auto",
  overscrollBehaviorX: "contain",
  scrollSnapType: "x mandatory",
  scrollbarWidth: "none",
  "&::-webkit-scrollbar": { display: "none" },
  // Room for the tilt and the shadow, and a gutter that matches the band's own.
  mx: "-4",
  px: "4",
  pt: "4",
  pb: "5",
  scrollPaddingInline: "4",
  _focusVisible: {
    outlineWidth: "2px",
    outlineStyle: "solid",
    outlineColor: "border.focusRing",
    outlineOffset: "2px",
  },
  lg: {
    gridAutoFlow: "row",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    overflowX: "visible",
    mx: "0",
    p: "0",
    gap: "6",
  },
});

/**
 * One tile and its "1b" hover: the light follows the pointer and the tile tilts toward it, up to six
 * degrees (`useTiltLight` writes the custom properties, mouse only, never with reduced motion). No
 * border change and no top border on hover (STYLE-GUIDE 2.7).
 */
export const featureItem = css({
  scrollSnapAlign: "start",
  position: "relative",
  display: "grid",
  borderRadius: "card",
  transform: "perspective(900px) rotateX(var(--tilt-rx, 0deg)) rotateY(var(--tilt-ry, 0deg))",
  _motionSafe: {
    transitionProperty: "transform",
    transitionDuration: "marketing.hover",
    transitionTimingFunction: "marketing.calm",
  },
  // The moving light: a soft mint gradient that follows the pointer, over the glass card.
  _after: {
    content: '""',
    position: "absolute",
    inset: "0",
    borderRadius: "inherit",
    pointerEvents: "none",
    backgroundImage:
      "radial-gradient(320px circle at var(--light-x, 50%) var(--light-y, 0%), color-mix(in oklab, token(colors.primary) 16%, transparent), color-mix(in oklab, token(colors.primary) 6%, transparent) 40%, transparent 72%)",
    opacity: "0",
    _motionSafe: {
      transitionProperty: "opacity",
      transitionDuration: "marketing.hover",
      transitionTimingFunction: "marketing.calm",
    },
  },
  "&[data-tilt-light=on]::after": { opacity: "1" },
});

export const featureCard = css({
  height: "full",
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: "3",
});

/** The document picture: centred, never narrower than its 280px floor (STYLE-GUIDE 8.3). */
export const featurePicture = css({ alignSelf: "center", width: "full", maxWidth: "xs" });

export const featureName = css({ textStyle: "heading.md", color: "text.primary", margin: 0 });

export const featureLink = css({
  color: "text.primary",
  textDecoration: "underline",
  textDecorationColor: "primary",
  textUnderlineOffset: "4px",
  borderRadius: "sm",
  _hover: { color: "primary.emphasis" },
  _focusVisible: {
    outlineWidth: "2px",
    outlineStyle: "solid",
    outlineColor: "border.focusRing",
    outlineOffset: "3px",
  },
});

export const featureText = css({ textStyle: "body.md", color: "text.secondary", margin: 0 });

export const featureNote = css({ textStyle: "body.sm", color: "text.secondary", margin: 0 });

/** Previous, the dots and next, under the row. Shown only once script has measured an overflow. */
export const controls = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "2",
    "&[hidden]": { display: "none" },
  },
});

export const bandFooter = css({ textStyle: "body.md", color: "text.secondary", margin: 0 });

export const bandLink = css({
  color: "primary",
  fontWeight: "semibold",
  textDecoration: "underline",
  textUnderlineOffset: "3px",
  _hover: { color: "primary.emphasis" },
  _focusVisible: {
    outlineWidth: "2px",
    outlineStyle: "solid",
    outlineColor: "border.focusRing",
    outlineOffset: "2px",
  },
});
