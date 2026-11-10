import type { FC, ReactNode } from "react";
import { css, cx, type RecipeVariantProps } from "../../../styled-system/css";
import { progressFillRecipe, progressTrackRecipe } from "./ProgressBar.styles";

export type ProgressBarVariants = RecipeVariantProps<typeof progressFillRecipe>;

export interface ProgressBarProps {
  value: number;
  max?: number;
  variant?: ProgressBarVariants["variant"];
  label?: string;
  valueDisplay?: ReactNode;
  height?: number;
  showPercent?: boolean;
  className?: string;
}

export const ProgressBar: FC<ProgressBarProps> = ({
  value,
  max = 100,
  variant = "primary",
  label,
  valueDisplay,
  height = 8,
  showPercent = false,
  className,
}) => {
  const safeMax = max <= 0 ? 100 : max;
  const percentage = Math.min(100, Math.max(0, (value / safeMax) * 100));

  return (
    <div className={className}>
      {(label || valueDisplay || showPercent) && (
        <div
          className={css({
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: "6px",
            fontSize: "xs",
          })}
        >
          {label && (
            <span className={css({ color: "text.muted", fontWeight: "medium" })}>{label}</span>
          )}
          <span
            className={css({
              color: "text.secondary",
              fontWeight: "semibold",
              fontVariantNumeric: "tabular-nums",
            })}
          >
            {valueDisplay ?? (showPercent ? `${Math.round(percentage)}%` : `${value} / ${max}`)}
          </span>
        </div>
      )}

      <div
        aria-label={label || "Progress"}
        aria-valuemax={max}
        aria-valuemin={0}
        aria-valuenow={value}
        className={cx(progressTrackRecipe())}
        role="progressbar"
        style={{ height: `${height}px` }}
      >
        <div className={cx(progressFillRecipe({ variant }))} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
};

export default ProgressBar;
