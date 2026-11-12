import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

export type UseChartAnimationOptions = {
  /** True while the user is dragging a slider or handle that redraws the chart. */
  isDragging?: boolean;
};

/**
 * Whether a chart should animate its transitions. False under reduced motion, and false while
 * dragging so live redraws follow the pointer without lag.
 */
export function useChartAnimation(options: UseChartAnimationOptions = {}): boolean {
  const reduced = usePrefersReducedMotion();
  return !reduced && !options.isDragging;
}
