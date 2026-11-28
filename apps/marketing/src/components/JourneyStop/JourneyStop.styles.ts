import { css, cva } from "@repo/ui/styled-system/css";

/*
 * One journey stop (prototype 11's `p11-stop` in `stops/stops.css`). Every rule outside the
 * `[data-live=on]` blocks is the finished, still page: a plain section in the vertical list. Once
 * scripts run and motion is allowed, the journey carries `data-live="on"` (HomeJourney) and its
 * custom properties (`--journey-head`, `--journey-screen`, `--journey-beat`, `--journey-span`,
 * `--journey-lane`): each stop is a screen plus a span tall and overlaps the one before by a
 * screen, so the stops start a span apart; each frame is a full screen, sticky under the header
 * from a beat above its section, and the arrive and leave timelines hide whichever is not its turn.
 * The section's top is where its pair has fully arrived.
 */

export const stop = css({
  position: "relative",
  zIndex: "1",
  "[data-live=on] &": {
    // Its own formatting context, so the frame's negative margin lifts the frame above the
    // section instead of collapsing into the section's margin.
    display: "flow-root",
    height: "calc(var(--journey-screen) + var(--journey-span))",
    // The last pair does not leave: it holds for its rest, then scrolls away with the page.
    "&:last-of-type": {
      height: "calc(var(--journey-screen) + var(--journey-span) - var(--journey-beat))",
    },
  },
  "[data-live=on] section + &": { marginTop: "calc(-1 * var(--journey-screen))" },
});

export const frame = css({
  display: "grid",
  alignItems: "center",
  boxSizing: "border-box",
  paddingBlock: "clamp(32px, 6vh, 56px)",
  paddingInline: { base: "4", md: "6" },
  "[data-live=on] &": {
    // The frames are full screens stacked over each other; only the visible pair takes the
    // pointer (a hidden pair's sides take none), so its links stay reachable.
    pointerEvents: "none",
    position: "sticky",
    top: "var(--journey-head)",
    height: "var(--journey-screen)",
    marginTop: "calc(-1 * var(--journey-beat))",
    // Centred in the window (owner, 28 Nov 2026), not top-aligned as the prototype's CSS has it,
    // which left a tall window's lower part empty. The frame starts under the header, so a
    // bottom padding of the header's height makes its content box centred on the window. The
    // pair sits in the middle row between two spacers that share the free space equally, each
    // held to a minimum: above, the prototype's gap under the header; below, clear of the orb
    // resting in its band (`--journey-orb-clear`). So the pair is centred when there is room,
    // rises just enough to stay off the orb when there is less, and starts under the header
    // when even that is too tall.
    "--journey-orb-clear": {
      // The scene's lane (`laneFor` in journeyLayout.ts): on a phone a band of an eighth of the
      // height and a 38px orb; else a band of 130px held to 11% to 17% of the height and an orb
      // of half the band, at most 66px. Plus 16px of air.
      base: "calc(12.5svh + 38px + 16px)",
      md: "calc(clamp(11svh, 130px, 17svh) + min(66px, clamp(11svh, 130px, 17svh) / 2) + 16px)",
    },
    gridTemplateRows: {
      base: "minmax(12px, 1fr) auto minmax(calc(var(--journey-orb-clear) - var(--journey-head)), 1fr)",
      md: "minmax(clamp(16px, 4vh, 40px), 1fr) auto minmax(calc(var(--journey-orb-clear) - var(--journey-head)), 1fr)",
    },
    paddingTop: "0",
    paddingBottom: "var(--journey-head)",
    // The pair takes the middle row.
    "& > *": { gridRow: "2" },
  },
  // The first frame starts at its section's top, after the journey's intro.
  "[data-live=on] section:first-of-type > &": { marginTop: "0" },
});

export const pair = cva({
  base: {
    width: "100%",
    maxWidth: "70rem",
    marginInline: "auto",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    gap: { base: "12px", md: "20px" },
    alignItems: "center",
    "[data-live=on] &": { pointerEvents: "auto" },
  },
  variants: {
    /** Which side the sample shows on from 60rem; the sides swap at every stop. */
    sampleSide: {
      right: {
        "@media (min-width: 60rem)": {
          gridTemplateColumns: "minmax(0, 5fr) minmax(0, 7fr)",
          gap: "clamp(24px, 4vw, 64px)",
        },
      },
      left: {
        "@media (min-width: 60rem)": {
          gridTemplateColumns: "minmax(0, 7fr) minmax(0, 5fr)",
          gap: "clamp(24px, 4vw, 64px)",
          "& > [data-stop-side=sample]": { order: "-1" },
        },
      },
    },
  },
});

export const side = css({
  minWidth: "0",
});

/** The text panel (`p11-stop__panel`): a 24px glass card. */
export const panel = css({
  display: "grid",
  gap: { base: "2", md: "3" },
  justifyItems: "start",
  padding: { base: "16px 18px", md: "24px", xl: "32px" },
  borderRadius: { base: "20px", md: "24px" },
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "material.glass.border",
  backgroundColor: "material.glass.fill",
  backgroundImage: "linear-gradient(155deg, token(colors.material.glass.sheen), transparent 45%)",
  boxShadow: "card",
  color: "text.primary",
  "& > *": { margin: "0" },
});

/** "N of 6", with its small orb-coloured dot. */
export const kicker = css({
  display: "flex",
  alignItems: "center",
  gap: { base: "10px", md: "14px" },
  color: "text.secondary",
  fontSize: "sm",
  fontWeight: "semibold",
  letterSpacing: "0.02em",
  "& > span:last-child": { fontVariantNumeric: "tabular-nums" },
});

export const title = css({
  fontSize: { base: "2xl", md: "3xl", xl: "4xl" },
  fontWeight: "bold",
  lineHeight: "1.1",
  letterSpacing: "-0.02em",
  textWrap: "balance",
});

export const lead = css({
  fontSize: { base: "md", md: "lg" },
  lineHeight: "1.5",
});

export const fact = css({
  color: "text.secondary",
  fontSize: { base: "sm", md: "md" },
  lineHeight: { base: "1.45", md: "1.55" },
});

export const link = css({
  fontSize: "md",
  fontWeight: "semibold",
  color: "primary",
  textDecoration: "underline",
  textUnderlineOffset: "3px",
  borderRadius: "sm",
  _hover: { color: "primary.hover" },
  _focusVisible: { outline: "none", boxShadow: "focus" },
});

/** The last stop's call to action. */
export const ctas = css({
  marginTop: "1",
  // Prototype 11's `p11-stop__ctas > div`: the buttons start at the left at every width.
  "& > div": { justifyContent: "flex-start" },
});
