import { css } from "@repo/ui/styled-system/css";

/** The steps, then the calendar page; from 60rem the page sits beside them (prototype 11). */
export const roughLayout = css({
  display: "grid",
  gridTemplateColumns: "1fr",
  alignItems: "center",
  gap: "8",
  "@media (min-width: 60rem)": {
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: "clamp(40px, 5vw, 96px)",
  },
});

export const steps = css({ position: "relative" });

/** The faint track behind the nodes, from the first node's centre to the last. */
export const stepsTrack = css({
  position: "absolute",
  left: "21px",
  top: "22px",
  bottom: "22px",
  width: "2px",
  borderRadius: "full",
  backgroundColor: "border",
});

/** The line that draws down the track once, by time. Drawn complete without script (MK1). */
export const stepsLine = css({
  position: "absolute",
  inset: 0,
  borderRadius: "inherit",
  backgroundColor: "chart.primary",
  transformOrigin: "top center",
});

export const stepList = css({
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "grid",
  gap: "7",
});

export const step = css({
  position: "relative",
  display: "grid",
  gridTemplateColumns: "44px 1fr",
  columnGap: "4",
  rowGap: "1",
});

/**
 * The step's number on a circle that fills as the line reaches it (`--lit` from 0 to 1, tied to
 * scroll); at rest and in the server HTML it is filled: words on `primary.solid` take
 * `primary.foreground`. The second and third circles wear a soft violet or rose halo, the orb
 * colours on round objects only (prototype 11; MC1 allow-list).
 */
export const stepNode = css({
  "--lit": "1",
  gridRow: "span 2",
  display: "grid",
  placeItems: "center",
  width: "44px",
  height: "44px",
  borderRadius: "full",
  borderWidth: "2px",
  borderStyle: "solid",
  borderColor: "primary",
  backgroundColor:
    "color-mix(in oklab, token(colors.primary.solid) calc(var(--lit) * 100%), token(colors.surface.canvas))",
  color:
    "color-mix(in oklab, token(colors.primary.foreground) calc(var(--lit) * 100%), token(colors.primary))",
  fontSize: "lg",
  fontWeight: "bold",
  fontVariantNumeric: "tabular-nums",
  "li:nth-child(2) > &": {
    boxShadow: "0 0 0 5px color-mix(in oklab, token(colors.orb.violetRose.core) 18%, transparent)",
  },
  "li:nth-child(3) > &": {
    boxShadow: "0 0 0 5px color-mix(in oklab, token(colors.orb.violetRose.shade) 16%, transparent)",
  },
});

/** Step titles and bodies grow a little with the screen, as prototype 11's. */
export const stepTitle = css({
  textStyle: "heading.md",
  fontSize: { base: "lg", md: "xl", xl: "2xl" },
  fontWeight: "bold",
  color: "text.primary",
  margin: 0,
  mt: "2",
});

export const stepBody = css({
  textStyle: "body.md",
  fontSize: { base: "md", "2xl": "lg" },
  lineHeight: "prose",
  color: "text.secondary",
  margin: 0,
  maxWidth: "2xl",
});

/**
 * The calendar page, under the steps and from 60rem beside them, at every width as prototype 11
 * (it shows a date, no figure). The wrapper keeps room under the page, which is drawn a little
 * taller than its box and rises as it arrives, so it never reaches the next band. Beside the steps
 * it is drawn 400px wide, so the calendar stands as tall as prototype 11's (its art box, 364px with
 * the room under it, sets the band's height there).
 */
export const roughPicture = css({
  width: "full",
  maxWidth: "xs",
  // Stacked, the drawing keeps the small document size (280px).
  "& > svg": { maxWidth: "280px" },
  "@media (min-width: 60rem)": {
    width: "400px",
    maxWidth: "400px",
    "& > svg": { maxWidth: "400px" },
  },
  justifySelf: "center",
  pb: "clamp(56px, 3rem + 1.5vw, 88px)",
});
