import { css } from "@repo/ui/styled-system/css";

/*
 * Prototype 11's "Getting started" ticket (`art/round6`, OnboardingB), drawn in SVG so it scales as
 * one picture: the prototype's stage is 22 by 14 of its em, here 352 by 224 user units (16 a em),
 * and the drawing is at most 374px wide (the prototype's 17px em) and never wider than its box.
 * Text sizes are type-scale steps in user units, so they scale with the drawing. Colours are
 * semantic tokens: paper, its edge and ruling, mint figures, dashed perforations, no top band.
 */
export const picture = css({
  display: "block",
  width: "min(374px, 100%)",
  height: "auto",
  mx: "auto",
  overflow: "visible",
});

/** The paper's soft shadow below it, as the prototype's (a shadow in the ink, pulled in). */
export const ticket = css({
  filter:
    "drop-shadow(0 12px 12px color-mix(in oklab, token(colors.text.primary) 22%, transparent))",
});

export const paper = css({
  fill: "surface.card",
  stroke: "border",
  strokeWidth: "1",
});

export const ruling = css({
  fill: "color-mix(in oklab, token(colors.text.primary) 2.5%, transparent)",
});

/** Written with `token()`: Panda does not read a bare token name in `stopColor` (it painted black). */
export const sheenFrom = css({
  stopColor: "color-mix(in oklab, token(colors.surface.card) 0%, transparent)",
});

export const sheenTo = css({
  stopColor: "color-mix(in oklab, token(colors.text.primary) 9%, transparent)",
});

export const title = css({
  fontFamily: "heading",
  fontSize: "md",
  fontWeight: "bold",
  fill: "text.primary",
});

export const tagPill = css({ fill: "surface.subtle", stroke: "border", strokeWidth: "1" });

export const tagText = css({
  fontFamily: "body",
  fontSize: "sm",
  fontWeight: "semibold",
  fill: "text.secondary",
});

export const perforation = css({
  stroke: "border.strong",
  strokeWidth: "2",
  strokeDasharray: "4 4",
});

export const stepNumber = css({
  fontFamily: "heading",
  fontSize: "2xl",
  fontWeight: "bold",
  fill: "primary",
  fontVariantNumeric: "tabular-nums",
});

export const stepLabel = css({
  fontFamily: "body",
  fontSize: "md",
  fontWeight: "bold",
  fill: "text.primary",
});

export const stepNote = css({
  fontFamily: "body",
  fontSize: "sm",
  fill: "text.secondary",
  fontVariantNumeric: "tabular-nums",
});
