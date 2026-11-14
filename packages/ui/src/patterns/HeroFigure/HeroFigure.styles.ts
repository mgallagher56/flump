import { sva } from "../../../styled-system/css";

/**
 * E16 P2: the page's one headline figure. `hero` is the single deep-teal block per page
 * (`surface.hero`, text in `text.onContrast`) with one soft decorative shape. `plain` is the
 * fallback when the value is unknown: an ordinary card with a "Not set" prompt, never the hero.
 */
export const heroFigure = sva({
  slots: [
    "root",
    "shape",
    "content",
    "label",
    "value",
    "delta",
    "subline",
    "unset",
    "prompt",
    "action",
  ],
  base: {
    root: {
      position: "relative",
      overflow: "hidden",
      isolation: "isolate",
      borderRadius: "card",
      borderWidth: "1px",
      borderStyle: "solid",
      p: { base: "5", md: "6" },
      minWidth: "0",
    },
    shape: {
      position: "absolute",
      zIndex: "-1",
      width: "16rem",
      height: "16rem",
      insetInlineEnd: "-5rem",
      insetBlockStart: "-6rem",
      borderRadius: "full",
      backgroundColor: "primary.solid",
      opacity: 0.18,
      pointerEvents: "none",
    },
    content: {
      display: "flex",
      flexDirection: "column",
      gap: "1",
      minWidth: "0",
    },
    label: {
      textStyle: "label.md",
      margin: "0",
      overflowWrap: "anywhere",
    },
    value: {
      textStyle: "numeric.hero",
      fontVariantNumeric: "tabular-nums",
      margin: "0",
      overflowWrap: "anywhere",
    },
    delta: {
      display: "inline-flex",
      alignItems: "center",
      gap: "1",
      textStyle: "body.sm",
      fontWeight: "medium",
      fontVariantNumeric: "tabular-nums",
      margin: "0",
    },
    subline: {
      textStyle: "body.sm",
      fontVariantNumeric: "tabular-nums",
      margin: "0",
    },
    unset: {
      textStyle: "numeric.unset",
      color: "text.muted",
      margin: "0",
    },
    prompt: {
      textStyle: "body.sm",
      color: "text.secondary",
      margin: "0",
    },
    action: {
      display: "flex",
      flexWrap: "wrap",
      gap: "2",
      pt: "2",
    },
  },
  variants: {
    tone: {
      hero: {
        root: {
          backgroundColor: "surface.hero",
          borderColor: "surface.hero",
          color: "text.onContrast",
          // border.focusRing is under 3:1 on the light hero, so descendants use the text colour.
          "& :focus-visible": { outlineColor: "text.onContrast" },
        },
        label: { color: "text.onContrast" },
        value: { color: "text.onContrast" },
        delta: { color: "text.onContrast" },
        subline: { color: "text.onContrast" },
      },
      plain: {
        root: {
          backgroundColor: "surface.card",
          borderColor: "border",
          boxShadow: "card",
          color: "text.primary",
        },
        label: { color: "text.secondary" },
      },
    },
  },
  defaultVariants: { tone: "hero" },
});
