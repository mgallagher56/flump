import type { CSSProperties, FC, ReactNode } from "react";
import { cx, type RecipeVariantProps } from "../../../styled-system/css";
import {
  progressFillRecipe,
  progressHeaderRecipe,
  progressLabelRecipe,
  progressTrackRecipe,
  progressValueRecipe,
} from "./ProgressBar.styles";

export type ProgressBarVariants = RecipeVariantProps<typeof progressFillRecipe>;
export type ProgressBarSize = "sm" | "md" | "lg";

export interface ProgressBarProps {
  value: number;
  max?: number;
  /** Tone of the fill. */
  variant?: ProgressBarVariants["variant"];
  label?: string;
  /** Replaces the default "value / max" (or percentage) text beside the label. */
  valueDisplay?: ReactNode;
  /** Track thickness: 6px, 10px (default) or 14px. */
  size?: ProgressBarSize;
  /** @deprecated Use `size`. Mapped to the nearest size (up to 6 sm, up to 10 md, else lg). */
  height?: number;
  showPercent?: boolean;
  /**
   * Spoken value, for example "£15,000 of £20,000 used". Defaults to the visible value text when
   * that is a string, otherwise "X of Y".
   */
  valueText?: string;
  className?: string;
}

const numberFormat = new Intl.NumberFormat("en-GB");

const sizeFromHeight = (height: number): ProgressBarSize =>
  height <= 6 ? "sm" : height <= 10 ? "md" : "lg";

export const ProgressBar: FC<ProgressBarProps> = ({
  value,
  max = 100,
  variant = "primary",
  label,
  valueDisplay,
  size,
  height,
  showPercent = false,
  valueText,
  className,
}) => {
  const safeMax = max <= 0 ? 100 : max;
  const safeValue = Math.min(safeMax, Math.max(0, Number.isFinite(value) ? value : 0));
  const percentage = (safeValue / safeMax) * 100;
  const resolvedSize = size ?? (height === undefined ? "md" : sizeFromHeight(height));

  const defaultText = showPercent
    ? `${Math.round(percentage)}%`
    : `${numberFormat.format(safeValue)} / ${numberFormat.format(safeMax)}`;
  const visibleValue = valueDisplay ?? defaultText;
  const spokenValue =
    valueText ??
    (typeof valueDisplay === "string"
      ? valueDisplay
      : showPercent
        ? defaultText
        : `${numberFormat.format(safeValue)} of ${numberFormat.format(safeMax)}`);

  const fillStyle = { "--progress-value": `${percentage}%` } as CSSProperties;

  return (
    <div className={className}>
      {(label || valueDisplay || showPercent) && (
        <div className={progressHeaderRecipe()}>
          {label ? <span className={progressLabelRecipe()}>{label}</span> : <span />}
          <span className={progressValueRecipe()}>{visibleValue}</span>
        </div>
      )}

      <div
        aria-label={label || "Progress"}
        aria-valuemax={safeMax}
        aria-valuemin={0}
        aria-valuenow={safeValue}
        aria-valuetext={spokenValue}
        className={cx(progressTrackRecipe({ size: resolvedSize }))}
        role="progressbar"
      >
        <div className={cx(progressFillRecipe({ variant }))} style={fillStyle} />
      </div>
    </div>
  );
};

export default ProgressBar;
