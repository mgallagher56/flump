import { css, cva } from "@repo/ui/styled-system/css";

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
    gap: "clamp(20px, 1.6vw, 32px)",
  },
});

/** One tile: the tilt and light come from `TiltLight`; here it snaps into the row. */
export const featureItem = css({ scrollSnapAlign: "start", borderRadius: "2xl" });

/** As prototype 11's tile: 24px in and a 24px corner, roomier from 90rem. */
export const featureCard = css({
  height: "full",
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: "2.5",
  p: "6",
  borderRadius: "2xl",
  "@media (min-width: 90rem)": { p: "clamp(24px, 1.8vw, 36px)" },
});

/**
 * The document picture: centred, never narrower than its 280px floor (STYLE-GUIDE 8.3), in a box of
 * one height for every tile, so each tile's name starts on the same line and a taller picture (the
 * AI connection's chat) never stretches its row.
 */
export const featurePicture = css({
  alignSelf: "center",
  width: "full",
  maxWidth: "xs",
  height: "11.75rem",
  display: "flex",
  justifyContent: "center",
  "& svg": { height: "full", width: "auto", maxWidth: "full" },
});

export const featureName = css({
  textStyle: "heading.md",
  fontSize: { base: "xl", xl: "2xl" },
  fontWeight: "bold",
  color: "text.primary",
  margin: 0,
});

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

export const featureText = css({
  textStyle: "body.md",
  color: "text.secondary",
  margin: 0,
  "@media (min-width: 90rem)": { fontSize: "lg" },
});

export const featureNote = css({
  textStyle: "body.sm",
  color: "text.secondary",
  margin: 0,
  "@media (min-width: 90rem)": { fontSize: "md" },
});

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
