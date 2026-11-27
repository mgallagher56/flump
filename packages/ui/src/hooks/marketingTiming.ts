import { marketingDurations, marketingEasings } from "@flump/tokens";

/** A key of the marketing calm scale (`packages/tokens/src/motion.ts`, STYLE-GUIDE 11). */
export type MarketingDuration = keyof typeof marketingDurations;

/** The calm scale's value for `key` in milliseconds ("588ms" gives 588). */
export function marketingMs(key: MarketingDuration): number {
  return Number.parseFloat(marketingDurations[key].value);
}

/**
 * A CSS `cubic-bezier(x1, y1, x2, y2)` as a function of progress (0 to 1), solved by Newton steps
 * with a bisection fallback, so JavaScript-driven motion follows the same curve as the CSS.
 * Returns exactly 0 at 0 and exactly 1 at 1.
 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const ax = 3 * x1 - 3 * x2 + 1;
  const bx = 3 * x2 - 6 * x1;
  const cx = 3 * x1;
  const ay = 3 * y1 - 3 * y2 + 1;
  const by = 3 * y2 - 6 * y1;
  const cy = 3 * y1;
  const xAt = (s: number) => ((ax * s + bx) * s + cx) * s;
  const yAt = (s: number) => ((ay * s + by) * s + cy) * s;
  const slopeX = (s: number) => (3 * ax * s + 2 * bx) * s + cx;
  return (t) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let s = t;
    for (let i = 0; i < 8; i++) {
      const error = xAt(s) - t;
      if (Math.abs(error) < 1e-6) return yAt(s);
      const slope = slopeX(s);
      if (Math.abs(slope) < 1e-6) break;
      s -= error / slope;
    }
    let low = 0;
    let high = 1;
    s = t;
    while (high - low > 1e-6) {
      if (xAt(s) < t) low = s;
      else high = s;
      s = (low + high) / 2;
    }
    return yAt(s);
  };
}

function parseCubicBezier(value: string): (t: number) => number {
  const match = /cubic-bezier\(([^)]+)\)/.exec(value);
  const [x1, y1, x2, y2] = (match?.[1] ?? "").split(",").map((n) => Number.parseFloat(n));
  if ([x1, y1, x2, y2].some((n) => n === undefined || Number.isNaN(n))) {
    throw new Error(`Not a cubic-bezier easing: ${value}`);
  }
  return cubicBezier(x1 as number, y1 as number, x2 as number, y2 as number);
}

/** `easings.marketing.calm` as a function: arriving, opening, gliding. */
export const calmEase = parseCubicBezier(marketingEasings.calm.value);

/** `easings.marketing.calmInOut` as a function: travel, and a disclosure's height. */
export const calmInOutEase = parseCubicBezier(marketingEasings.calmInOut.value);
