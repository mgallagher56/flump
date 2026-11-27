import { cva } from "@repo/ui/styled-system/css";

/*
 * A clear glass orb drawn in CSS (prototype 11's `art/GlassOrb.tsx` and `art.css`): a nearly
 * clear body coloured towards the rim, a caustic on the far side, a specular highlight, a thin
 * bright edge on the lit side and a soft shadow in its own colour. The orb's colour is its
 * `color` (one of the orb tokens, STYLE-GUIDE 2.7), so the gradients mix `currentColor` and the
 * three.js scene can read the same token back as a computed colour. Orb-like, so violet and rose
 * are allowed here (MC1). The size is `--orb-size`: from the `size` variant, or from the class
 * that places the orb.
 */
export const glassOrb = cva({
  base: {
    "--orb-light": { base: "{colors.surface.card}", _dark: "{colors.text.onContrast}" },
    position: "relative",
    display: "inline-block",
    flex: "none",
    width: "var(--orb-size, 4.5rem)",
    aspectRatio: "1",
    borderRadius: "full",
    pointerEvents: "none",
    background: [
      // The specular highlight, top left.
      "radial-gradient(circle at 31% 24%, color-mix(in oklab, var(--orb-light) 92%, transparent) 0 4%, color-mix(in oklab, var(--orb-light) 30%, transparent) 9%, transparent 20%)",
      // The caustic: light gathered on the far side, lower right.
      "radial-gradient(circle at 66% 78%, color-mix(in oklab, currentColor 46%, transparent) 0, transparent 42%)",
      // The body: clear in the middle, coloured towards the rim.
      "radial-gradient(circle at 50% 50%, color-mix(in oklab, currentColor 6%, transparent) 0 46%, color-mix(in oklab, currentColor 26%, transparent) 78%, color-mix(in oklab, currentColor 58%, transparent) 100%)",
    ].join(", "),
    boxShadow: [
      "inset 0 0 0 1px color-mix(in oklab, currentColor 55%, transparent)",
      "inset 0 calc(var(--orb-size, 4.5rem) * 0.08) calc(var(--orb-size, 4.5rem) * 0.1) color-mix(in oklab, var(--orb-light) 28%, transparent)",
      "inset 0 calc(var(--orb-size, 4.5rem) * -0.1) calc(var(--orb-size, 4.5rem) * 0.18) color-mix(in oklab, currentColor 34%, transparent)",
      "0 calc(var(--orb-size, 4.5rem) * 0.22) calc(var(--orb-size, 4.5rem) * 0.3) calc(var(--orb-size, 4.5rem) * -0.16) color-mix(in oklab, currentColor 55%, transparent)",
    ].join(", "),
    // A thin bright rim on the lit side, like a glass edge catching the light.
    _after: {
      content: '""',
      position: "absolute",
      inset: "3%",
      borderRadius: "full",
      borderWidth: "1.5px",
      borderStyle: "solid",
      borderColor: "transparent",
      borderTopColor: "color-mix(in oklab, var(--orb-light) 55%, transparent)",
      borderLeftColor: "color-mix(in oklab, var(--orb-light) 25%, transparent)",
      rotate: "-12deg",
    },
  },
  variants: {
    /** The four orb colours: set A sky and teal, set B violet and rose. */
    tone: {
      sky: { color: "orb.skyTeal.core" },
      teal: { color: "orb.skyTeal.shade" },
      violet: { color: "orb.violetRose.core" },
      rose: { color: "orb.violetRose.shade" },
    },
    /** Optional fixed sizes; leave it out when the placing class sets `--orb-size`. */
    size: {
      sm: { "--orb-size": "3.5rem" },
      md: { "--orb-size": "5rem" },
      lg: { "--orb-size": "7rem" },
      xl: { "--orb-size": "9rem" },
    },
  },
  defaultVariants: { tone: "sky" },
});

/**
 * A small orb-coloured dot with a soft ring in the same colour (prototype 11's kicker dot beside
 * "N of 6"): the quiet accent of the orb's colours beside the mint lead (MC1 allows it as an
 * orb-like mark). Decoration only.
 */
export const orbDot = cva({
  base: {
    display: "inline-block",
    flex: "none",
    width: "8px",
    height: "8px",
    borderRadius: "full",
    backgroundColor: "currentColor",
    boxShadow: "0 0 0 4px color-mix(in oklab, currentColor 18%, transparent)",
  },
  variants: {
    tone: {
      sky: { color: "orb.skyTeal.core" },
      teal: { color: "orb.skyTeal.shade" },
      violet: { color: "orb.violetRose.core" },
      rose: { color: "orb.violetRose.shade" },
    },
  },
  defaultVariants: { tone: "sky" },
});
