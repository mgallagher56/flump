import { css, cva } from "@repo/ui/styled-system/css";

/**
 * The layer: fills its band, takes no space and no pointer, sits behind the band's content. Not
 * clipped: a bubble may run past the band's box, as in prototype 11, rather than end in a straight
 * cut; the page shell clips sideways overflow, so the page never scrolls sideways.
 */
export const field = cva({
  base: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    zIndex: 0,
    // The band's own content stacks above the field.
    "& ~ *": { position: "relative", zIndex: 1 },
  },
  variants: {
    fit: {
      band: {},
      // The home hero: inside its centred column, reaching out to the window's edges (the hero
      // clips sideways overflow), and a size container for its spots.
      hero: {
        left: "calc(50% - 50vw)",
        right: "calc(50% - 50vw)",
        containerType: "size",
      },
      // Beside a second list, and in the close, the small upper bubble would sit on the heading.
      beside: { "& > span:nth-child(2)": { display: "none" } },
      // Behind a journey sample (prototype 11's `.p11-v-accounts > .proto-bubbles`): a little past
      // the sample's box, and all three bubbles at full size at every width, since the journey is
      // not one of the prototype's bands.
      sample: {
        inset: "-24px -16px",
        "& > span": { display: "block", scale: "1" },
      },
    },
  },
  defaultVariants: { fit: "band" },
});

/**
 * One bubble: a still glass orb in one of the two orb sets (STYLE-GUIDE 2.7; violet and rose only
 * on orb-like elements, MC1), lit like the journey's three.js orbs but quieter, since it sits in the
 * background (owner, 28 Nov 2026: "the marketing side background bubbles should also be glass
 * orbs"). Every layer is a radial gradient inside the bubble's own circle, so it scales with any
 * size and nothing reaches past the box the clearance checks measure. No rim line and no outer
 * shadow. Where the browser supports scroll-driven animation, it drifts between
 * `--drift-from` and `--drift-to` as its band crosses the screen (prototype 11), so it moves only
 * when the reader scrolls. Still with reduced motion, from the system or the header's "Reduce motion"
 * (MK14). On a narrow screen only the first, large bubble stays, at a little over half size and
 * pushed to its edge, so none sits behind the copy.
 */
export const bubble = cva({
  base: {
    // The light on the glass: the off-white in both themes.
    "--bubble-light": "{colors.text.onContrast}",
    position: "absolute",
    borderRadius: "full",
    opacity: { base: 0.7, _dark: 0.8, _systemDark: 0.8 },
    // Written as joined string literals, never `[...].join()`: Panda reads styles at build time.
    // The body's tone is `color` and the caustic's `--bubble-far`, both from the set.
    backgroundImage:
      // The specular highlight, top right, where the journey's light falls.
      "radial-gradient(circle at 70% 26%, var(--bubble-light) 0 3.5%, color-mix(in oklab, var(--bubble-light) 35%, transparent) 6%, transparent 11%), " +
      // The soft sheen across the upper half.
      "radial-gradient(ellipse 60% 44% at 46% 28%, color-mix(in oklab, var(--bubble-light) 46%, transparent), transparent 72%), " +
      // The Fresnel glow: lighter towards the edge and fading again before it, so no line is drawn.
      "radial-gradient(circle at 50% 50%, transparent 0 60%, color-mix(in oklab, var(--bubble-light) 34%, transparent) 88%, color-mix(in oklab, var(--bubble-light) 12%, transparent) 100%), " +
      // The caustic: the set's second tone gathered low on the far side.
      "radial-gradient(circle at 56% 82%, color-mix(in oklab, var(--bubble-far) 32%, transparent), transparent 48%), " +
      // The body: tinted glass in the set's first tone over the band, denser towards the edge.
      "radial-gradient(circle at 46% 38%, color-mix(in oklab, currentColor 24%, transparent) 0, color-mix(in oklab, currentColor 42%, transparent) 66%, color-mix(in oklab, currentColor 64%, transparent) 100%)",
    _motionSafe: {
      "@supports (animation-timeline: view())": {
        animationName: "marketingDrift",
        animationTimingFunction: "linear",
        animationFillMode: "both",
        animationTimeline: "view()",
        animationRange: "cover 0% cover 100%",
      },
    },
  },
  variants: {
    set: {
      skyTeal: { color: "orb.skyTeal.core", "--bubble-far": "{colors.orb.skyTeal.shade}" },
      violetRose: { color: "orb.violetRose.core", "--bubble-far": "{colors.orb.violetRose.shade}" },
    },
    order: {
      first: { "@media (max-width: 55.99rem)": { scale: "0.55" } },
      second: { "@media (max-width: 55.99rem)": { display: "none" } },
      third: { "@media (max-width: 55.99rem)": { display: "none" } },
    },
  },
});

/**
 * A page's own spot (`BubbleSpot`): centred on `--spot-x`, `--spot-y`, `--spot-size` across, and
 * shown only in its range of widths. A spot sized to nothing (a gutter too narrow) draws nothing.
 */
export const spot = cva({
  base: {
    display: "none",
    left: "var(--spot-x)",
    top: "var(--spot-y)",
    width: "var(--spot-size)",
    height: "var(--spot-size)",
    marginLeft: "calc(var(--spot-size) / -2)",
    marginTop: "calc(var(--spot-size) / -2)",
  },
  variants: {
    show: {
      wide: { "@media (min-width: 64rem)": { display: "block" } },
      stacked: { "@media (min-width: 40rem) and (max-width: 63.99rem)": { display: "block" } },
      roomy: { "@media (min-width: 60rem) and (max-width: 63.99rem)": { display: "block" } },
      phone: { "@media (max-width: 39.99rem)": { display: "block" } },
    },
  },
});

/*
 * Prototype 11's places, layout by layout, in the order of `BUBBLE_LAYOUTS`: size, edge and drift.
 * A bubble at the right shrinks towards the right edge on a narrow screen, one at the left towards
 * the left.
 */
const toRight = { "@media (max-width: 55.99rem)": { transformOrigin: "100% 50%" } };
const toLeft = { "@media (max-width: 55.99rem)": { transformOrigin: "0% 50%" } };

export const BUBBLE_PLACES = {
  a: [
    css({
      width: "260px",
      height: "260px",
      right: "-90px",
      top: "8%",
      "--drift-from": "24px",
      "--drift-to": "-24px",
      ...toRight,
    }),
    css({
      width: "120px",
      height: "120px",
      right: "12%",
      bottom: "6%",
      "--drift-from": "60px",
      "--drift-to": "-60px",
      ...toRight,
    }),
    css({
      width: "70px",
      height: "70px",
      left: "-20px",
      top: "34%",
      "--drift-from": "100px",
      "--drift-to": "-100px",
      ...toLeft,
    }),
  ],
  b: [
    css({
      width: "300px",
      height: "300px",
      left: "-140px",
      bottom: "8%",
      "--drift-from": "24px",
      "--drift-to": "-24px",
      ...toLeft,
    }),
    css({
      width: "96px",
      height: "96px",
      right: "4%",
      top: "12%",
      "--drift-from": "60px",
      "--drift-to": "-60px",
      ...toRight,
    }),
    css({
      width: "54px",
      height: "54px",
      right: "24%",
      bottom: "4%",
      "--drift-from": "100px",
      "--drift-to": "-100px",
      ...toRight,
    }),
  ],
  c: [
    css({
      width: "180px",
      height: "180px",
      right: "-60px",
      bottom: "12%",
      "--drift-from": "30px",
      "--drift-to": "-30px",
      ...toRight,
    }),
    css({
      width: "80px",
      height: "80px",
      left: "6%",
      top: "10%",
      "--drift-from": "80px",
      "--drift-to": "-80px",
      ...toLeft,
    }),
  ],
} as const;
