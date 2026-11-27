import { css, cva } from "@repo/ui/styled-system/css";

/*
 * A sample line chart that can draw itself (prototype 11's `p11-v-chart`): a faint grid, a base
 * line, the area and the line in the chart's own colour, and a marker riding the line's end with
 * that month's figure. Chart colours from the chart tokens, as prototype 11's `data-tone`: savings
 * in sky (`chart.series6`), debt in violet (`chart.series4`), never rose.
 *
 * Rule conflict for the owner: MK6 and STYLE-GUIDE MC2 keep orb colours off debt, and MC1 keeps
 * violet to orb-like elements; the approved prototype draws the debt line in violet. Built as the
 * prototype (coordinator, 27 Nov 2026).
 */

export const chart = cva({
  base: { position: "relative" },
  variants: {
    /**
     * `journey`: the home journey's heights. `setPiece`: an area page's set piece, as the approved
     * area prototypes draw it (prototype 11's own `clamp(120px, 22vh, 200px)`), taller at 1000px.
     */
    size: {
      journey: {
        height: { base: "110px", md: "160px", lg: "190px" },
        margin: { base: "8px 6px 22px", md: "8px 6px 26px" },
      },
      setPiece: {
        height: { base: "110px", md: "clamp(120px, 22vh, 200px)" },
        margin: { base: "8px 6px 22px", md: "8px 6px 26px" },
      },
    },
    tone: {
      sky: { "--tone": "{colors.chart.series6}" },
      violet: { "--tone": "{colors.chart.series4}" },
    },
  },
  defaultVariants: { size: "journey", tone: "sky" },
});

/** The outer drawing: CSS pixels, so the marker, the readout and the ticks never stretch. */
export const frame = css({
  position: "absolute",
  inset: "0",
  width: "100%",
  height: "100%",
  overflow: "visible",
});

export const grid = css({
  stroke: "color-mix(in oklab, {colors.text.primary} 9%, transparent)",
  strokeWidth: "1",
});

export const base = css({
  stroke: "color-mix(in oklab, {colors.text.primary} 24%, transparent)",
  strokeWidth: "1",
});

export const area = css({
  fill: "color-mix(in oklab, var(--tone) 16%, transparent)",
});

export const line = css({
  fill: "none",
  stroke: "var(--tone)",
  strokeWidth: "3",
  strokeLinejoin: "round",
  strokeLinecap: "round",
});

export const marker = css({
  fill: "surface.card",
  stroke: "var(--tone)",
  strokeWidth: "3",
});

export const readoutBox = css({
  fill: "surface.card",
  stroke: "border",
  strokeWidth: "1",
});

export const readoutText = css({
  fill: "text.primary",
  fontSize: "sm",
  fontWeight: "semibold",
  fontVariantNumeric: "tabular-nums",
});

export const tick = css({
  fill: "text.secondary",
  fontSize: "sm",
  fontVariantNumeric: "tabular-nums",
});
