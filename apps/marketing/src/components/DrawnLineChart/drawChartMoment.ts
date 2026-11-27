import type { MomentTimeline } from "../../motion/moments/arrive";
import { PLOT, pct, pointAt, readoutWidth } from "./chartGeometry";

/*
 * The chart-draw moment (STYLE-GUIDE 11.2, "Self-drawing chart"; prototype 11's `buildChart`):
 * the line's clip widens from the left, the marker rides the line's end and its readout follows
 * with that month's figure, flipping to the marker's left past the middle. On the calm in-out
 * ease, once, inside the timeline that shows it, and it ends exactly on the finished chart.
 */

/** Draws `chart` (a `[data-drawn-chart]`) as far as `p`, from 0 to 1. */
export function placeChart(chart: HTMLElement, p: number): void {
  const clip = chart.querySelector("[data-chart-clip]");
  const marker = chart.querySelector("[data-chart-marker]");
  const readout = chart.querySelector("[data-chart-readout]");
  const box = readout?.querySelector("[data-readout-box]");
  const text = readout?.querySelector("[data-readout-text]");
  if (!clip || !marker || !readout || !box || !text) return;
  const values = (chart.dataset.values ?? "").split(",").map(Number);
  const readouts = (chart.dataset.readouts ?? "").split("|");
  const { x, y, index } = pointAt(values, p, Number(chart.dataset.max), Number(chart.dataset.min));
  clip.setAttribute("width", String(p * PLOT.width));
  marker.setAttribute("cx", pct(x));
  marker.setAttribute("cy", pct(y));
  readout.setAttribute("x", pct(x));
  readout.setAttribute("y", pct(y));
  const label = readouts[index] ?? "";
  if (text.textContent !== label || box.getAttribute("data-left") !== String(p > 0.5)) {
    const width = readoutWidth(label);
    // Past the middle the readout sits to the marker's left, so it never runs off the right.
    const left = p > 0.5 ? -width : 0;
    text.textContent = label;
    box.setAttribute("data-left", String(p > 0.5));
    box.setAttribute("width", String(width));
    box.setAttribute("x", String(left));
    text.setAttribute("x", String(left + 9));
  }
}

/** Adds the draw of the `[data-drawn-chart]` under `root` to `tl` at `at`, over `duration`. */
export function drawChartMoment(
  tl: MomentTimeline,
  root: ParentNode,
  at: number,
  duration: number,
): void {
  const chart = root.querySelector<HTMLElement>("[data-drawn-chart]");
  if (!chart) return;
  const state = { p: 1 };
  const place = () => placeChart(chart, state.p);
  tl.fromTo(
    state,
    { p: 0 },
    {
      p: 1,
      duration,
      ease: "calmInOut",
      onUpdate: place,
      onComplete: place,
      immediateRender: true,
    },
    at,
  );
}

/** Puts every chart under `root` back to finished (after a moment is reverted part-way). */
export function settleDrawnCharts(root: ParentNode): void {
  for (const chart of Array.from(root.querySelectorAll<HTMLElement>("[data-drawn-chart]"))) {
    placeChart(chart, 1);
  }
}
