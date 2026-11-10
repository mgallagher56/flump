import { css } from "@repo/ui/styled-system/css";
import type { FC, ReactNode } from "react";

export type ProgressBarVariant = "primary" | "positive" | "warning" | "negative";

export interface FLPProgressBarProps {
  value: number;
  max?: number;
  variant?: ProgressBarVariant;
  label?: string;
  valueDisplay?: ReactNode;
  height?: number;
  showPercent?: boolean;
  className?: string;
}

const variantFillMap: Record<ProgressBarVariant, string> = {
  primary: "primary",
  positive: "status.positive.solid",
  warning: "status.warning.solid",
  negative: "status.danger.solid",
};

export const FLPProgressBar: FC<FLPProgressBarProps> = ({
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

  const trackStyle = css({
    width: "100%",
    backgroundColor: "surface.sunken",
    borderRadius: "full",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    overflow: "hidden",
  });

  const fillStyle = css({
    height: "100%",
    borderRadius: "full",
    backgroundColor: variantFillMap[variant],
    transition: "width 0.4s ease-out",
  });

  const headerStyle = css({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "6px",
    fontSize: "xs",
  });

  return (
    <div className={className}>
      {(label || valueDisplay || showPercent) && (
        <div className={headerStyle}>
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
        aria-valuemax={max}
        aria-valuemin={0}
        aria-valuenow={value}
        className={trackStyle}
        role="progressbar"
        style={{ height: `${height}px` }}
      >
        <div className={fillStyle} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
};

export default FLPProgressBar;
