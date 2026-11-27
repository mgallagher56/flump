import { cva } from "../../../styled-system/css";

export const cardRecipe = cva({
  base: {
    backgroundColor: "surface.card",
    borderRadius: "card",
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
     * `shadows.glass`); with `elevation="interactive"` it gains a still hover light, never a top
     * border, a border colour change or a tilt. `paper` is the paper fill with faint ruled lines
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
    // Hover keeps the material's border and shadow: no border colour change, no top border.
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
        _hover: { borderColor: "material.glass.border", boxShadow: "glass" },
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
    // Last, so a material's fill wins over `surface`.
    material: "plain",
  },
});
