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
    "labelRow",
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
      // A graphic-only fill, so `chart.primary`, not `primary.solid` (a fill behind primary.foreground
      // only). Light: the same teal at 18%. Dark: the lighter chart teal is louder on the dark hero,
      // so it drops to 10% (R2-2), which keeps text.onContrast above 7:1 where they overlap. Both
      // dark conditions: component styles do not inherit the JS-off dark mode from tokens (D30).
      backgroundColor: "chart.primary",
      opacity: { base: "0.18", _dark: "0.1", _systemDark: "0.1" },
      pointerEvents: "none",
      // Forced colours strip fills, so the disc would show as a solid system-colour block.
      _highContrast: { display: "none" },
    },
    content: {
      display: "flex",
      flexDirection: "column",
      gap: "1",
      minWidth: "0",
    },
    labelRow: { display: "flex", alignItems: "center", gap: "1", minWidth: "0" },
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
          // Forced colours (Windows contrast themes) replace the hero fill with the system canvas,
          // and cream text on it was the gate's contrast finding. Use the system pair and keep a
          // real border so the block still reads as one block (UX A12).
          _highContrast: {
            backgroundColor: "Canvas",
            borderColor: "CanvasText",
            color: "CanvasText",
            "& *": { color: "CanvasText" },
            "& :focus-visible": { outlineColor: "Highlight" },
          },
        },
        label: { color: "text.onContrast" },
        // The InfoTip trigger defaults to text.muted, which fails on surface.hero. The extra type
        // and attribute outrank the trigger's doubled class (open state keeps its own colours).
        labelRow: {
          "& button[aria-haspopup]:not([data-state='open'])": { color: "text.onContrast" },
        },
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
