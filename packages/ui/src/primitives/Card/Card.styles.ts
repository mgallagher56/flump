import { cva } from "../../../styled-system/css";

export const cardRecipe = cva({
  base: {
    backgroundColor: "surface.card",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border",
    color: "text.primary",
    transitionProperty: "border-color, box-shadow",
    transitionDuration: "base",
    transitionTimingFunction: "standard",
  },
  variants: {
    /** `default` is the warm `surface.card`; `subtle` and `sunken` sit back for quiet blocks. */
    surface: {
      default: {},
      subtle: { backgroundColor: "surface.subtle" },
      sunken: { backgroundColor: "surface.sunken" },
    },
    elevation: {
      none: { boxShadow: "none" },
      resting: { boxShadow: "card" },
      interactive: {
        boxShadow: "card",
        cursor: "pointer",
        _hover: {
          borderColor: "border.strong",
          boxShadow: "cardHover",
        },
      },
      floating: { boxShadow: "floating" },
    },
    /**
     * The card's material (STYLE-GUIDE 2.7). `plain` is today's card. `glass` is the card fill
     * under a faint diagonal sheen, with a soft border and a faint inner top light (carried by
     * `shadows.glass`); with `elevation="interactive"` it gains a still hover light on top of the
     * usual whole-border hover cue, never a top-only border or a tilt. `paper` is the paper fill with faint ruled lines
     * and its edge, with no hover light. Glass suits cards holding no figure in the apps (AT3).
     */
    material: {
      plain: {},
      glass: {
        backgroundColor: "material.glass.fill",
        backgroundImage:
          "linear-gradient(155deg, token(colors.material.glass.sheen), transparent 42%)",
        borderColor: "material.glass.border",
      },
      paper: {
        backgroundColor: "material.paper.fill",
        backgroundImage:
          "repeating-linear-gradient(0deg, token(colors.material.paper.rule) 0 1px, transparent 1px 4px)",
        borderColor: "material.paper.edge",
      },
    },
    /**
     * The corner, from the radius scale (STYLE-GUIDE section 5). Every app card keeps `card`
     * (16px); the marketing site's soft cards take `panel`, `tray` or `showcase`. A variant, not a
     * caller's class, so only one radius class is ever on the card and the caller's always wins.
     */
    radius: {
      card: { borderRadius: "card" },
      panel: { borderRadius: "panel" },
      tray: { borderRadius: "tray" },
      showcase: { borderRadius: "showcase" },
    },
    padding: {
      none: { p: "0" },
      sm: { p: "12px" },
      md: { p: "density.cardPad" },
      lg: { p: { base: "20px", md: "28px" } },
    },
  },
  compoundVariants: [
    // The material's own shadow wins over the elevation shadow; `elevation="none"` stays flat.
    {
      material: "glass",
      elevation: ["resting", "interactive", "floating"],
      css: { boxShadow: "glass" },
    },
    {
      material: "paper",
      elevation: ["resting", "interactive", "floating"],
      css: { boxShadow: "paper" },
    },
    // Paper hover keeps its border and shadow: no border colour change, no top border.
    {
      material: "paper",
      elevation: "interactive",
      css: { _hover: { borderColor: "material.paper.edge", boxShadow: "paper" } },
    },
    {
      material: "glass",
      elevation: "interactive",
      css: {
        position: "relative",
        isolation: "isolate",
        // Glass keeps the interactive elevation's hover cue (the whole border to border.strong and
        // shadows.cardHover, never a top-only border or a transform), since the light alone is
        // near-invisible in light theme.
        // Follow-up: material.glass.light and .sheen (F2) are off-white over an off-white fill in light.
        // The still hover light: a soft layer behind the content that brightens in place. It
        // never moves; under reduced motion it changes at once.
        _before: {
          content: '""',
          position: "absolute",
          inset: "0",
          zIndex: "-1",
          borderRadius: "inherit",
          pointerEvents: "none",
          backgroundImage:
            "radial-gradient(120% 90% at 50% 0%, token(colors.material.glass.light), transparent 70%)",
          opacity: "0",
          _motionSafe: {
            transitionProperty: "opacity",
            transitionDuration: "base",
            transitionTimingFunction: "standard",
          },
        },
        "@media (hover: hover)": {
          _hover: { _before: { opacity: "1" } },
        },
      },
    },
  ],
  defaultVariants: {
    surface: "default",
    elevation: "resting",
    padding: "md",
    radius: "card",
    // Last, so a material's fill wins over `surface`.
    material: "plain",
  },
});
