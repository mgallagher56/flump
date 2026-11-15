import type { FC } from "react";
import type { RecipeVariantProps } from "../../../styled-system/css";
import { progressRingRecipe } from "./ProgressRing.styles";

export type ProgressRingVariants = NonNullable<RecipeVariantProps<typeof progressRingRecipe>>;

export interface ProgressRingProps {
  /** Completed count or current progress value. */
  value: number;
  /** Optional animated stroke value (e.g. from useSetupProgressOnce) while keeping ARIA/label immediate. */
  animatedValue?: number;
  /** Maximum count or goal (defaults to 100 when non-positive). */
  max?: number;
  /** Accessible name announced for `role="progressbar"`. */
  label?: string;
  /** Short label rendered inside the ring (defaults to `${clamped}/${safeMax}`). */
  countLabel?: string;
  /** Spoken progress summary; defaults to `${clamped} of ${safeMax}`. */
  valueText?: string;
  size?: ProgressRingVariants["size"];
  id?: string;
}

const VIEW_SIZE = 40;
const CENTER = VIEW_SIZE / 2;
const RADIUS = 16;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Compact circular completion ring (`2/5`, etc.) for dense progress indicators such as
 * the home setup row. Renders pure semantic SVG stroke tokens with zero inline `style=` props.
 */
export const ProgressRing: FC<ProgressRingProps> = ({
  value,
  animatedValue,
  max = 100,
  label = "Progress",
  countLabel,
  valueText,
  size = "md",
  id,
}) => {
  const safeMax = max > 0 ? max : 100;
  const clamped = Math.max(0, Math.min(value, safeMax));
  const arcValue = Math.max(0, Math.min(animatedValue ?? value, safeMax));
  const ratio = arcValue / safeMax;
  const dashOffset = CIRCUMFERENCE * (1 - ratio);
  const styles = progressRingRecipe({ size });
  const centerText = countLabel ?? `${clamped}/${safeMax}`;
  const spokenText = valueText ?? `${clamped} of ${safeMax}`;

  return (
    <span
      aria-label={label}
      aria-valuemax={safeMax}
      aria-valuemin={0}
      aria-valuenow={clamped}
      aria-valuetext={spokenText}
      className={styles.root}
      data-testid={id}
      id={id}
      role="progressbar"
    >
      <svg
        aria-hidden="true"
        className={styles.svg}
        focusable="false"
        viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
      >
        <circle className={styles.track} cx={CENTER} cy={CENTER} r={RADIUS} />
        <circle
          className={styles.arc}
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${CENTER} ${CENTER})`}
        />
      </svg>
      <span aria-hidden="true" className={styles.count}>
        {centerText}
      </span>
    </span>
  );
};

export default ProgressRing;
