import { css } from "@repo/ui/styled-system/css";
import { type ChangeEvent, type FC, type InputHTMLAttributes, useCallback } from "react";
import { useResponsive } from "~/context/ResponsiveContext";

export interface FLPSliderProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  formatValue?: (val: number) => string;
  helperText?: string;
  onChange: (val: number) => void;
  isMobile?: boolean;
}

export const FLPSlider: FC<FLPSliderProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  formatValue,
  helperText,
  onChange,
  isMobile: propIsMobile,
  className,
  id,
  disabled,
  ...props
}) => {
  const { isMobile: contextIsMobile } = useResponsive();
  const isMobile = propIsMobile ?? contextIsMobile;
  const sliderId = id || `slider-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onChange(Number(e.target.value));
    },
    [onChange],
  );

  const percentage =
    max > min ? Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100)) : 0;
  const displayValue = formatValue ? formatValue(value) : `${value}${unit ? ` ${unit}` : ""}`;

  const containerStyle = css({
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    width: "100%",
  });

  const headerStyle = css({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  });

  const labelStyle = css({
    fontSize: "xs", // 12-13px
    fontWeight: "medium",
    color: "text.muted",
  });

  const valueBadgeStyle = css({
    fontSize: "xs",
    fontWeight: "semibold",
    fontVariantNumeric: "tabular-nums",
    padding: "2px 8px",
    borderRadius: "md",
    backgroundColor: "surface.sunken",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    color: "text.primary",
  });

  const trackWrapperStyle = css({
    position: "relative",
    display: "flex",
    alignItems: "center",
    minHeight: isMobile ? "44px" : "40px",
    width: "100%",
    cursor: disabled ? "not-allowed" : "pointer",
  });

  const rangeInputStyle = css({
    position: "absolute",
    width: "100%",
    height: "100%",
    opacity: 0,
    cursor: disabled ? "not-allowed" : "pointer",
    zIndex: 10,
    margin: 0,
    "&:focus-visible + div": {
      outline: "2px solid",
      outlineColor: "primary",
      outlineOffset: "2px",
    },
  });

  const visualTrackStyle = css({
    position: "relative",
    width: "100%",
    height: "6px",
    borderRadius: "full",
    backgroundColor: "surface.sunken",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    overflow: "visible",
  });

  const fillStyle = css({
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: "full",
    backgroundColor: "primary",
    transition: "width 0.05s linear",
  });

  const thumbIndicatorStyle = css({
    position: "absolute",
    top: "50%",
    width: "16px",
    height: "16px",
    borderRadius: "full",
    backgroundColor: "surface",
    borderWidth: "2px",
    borderStyle: "solid",
    borderColor: "primary",
    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
    transform: "translate(-50%, -50%)",
    pointerEvents: "none",
    transition: "transform 0.1s ease",
  });

  const helperStyle = css({
    fontSize: "xs",
    color: "text.muted",
    lineHeight: "1.3",
  });

  return (
    <div className={`${containerStyle} ${className || ""}`.trim()}>
      <div className={headerStyle}>
        <label className={labelStyle} htmlFor={sliderId}>
          {label}
        </label>
        <span className={valueBadgeStyle} data-tabular-nums>
          {displayValue}
        </span>
      </div>

      <div className={trackWrapperStyle}>
        <input
          aria-label={label}
          aria-valuemax={max}
          aria-valuemin={min}
          aria-valuenow={value}
          aria-valuetext={displayValue}
          className={rangeInputStyle}
          disabled={disabled}
          id={sliderId}
          max={max}
          min={min}
          step={step}
          type="range"
          value={value}
          onChange={handleChange}
          {...props}
        />
        <div className={visualTrackStyle}>
          <div className={fillStyle} style={{ width: `${percentage}%` }} />
          <div className={thumbIndicatorStyle} style={{ left: `${percentage}%` }} />
        </div>
      </div>

      {helperText && <p className={helperStyle}>{helperText}</p>}
    </div>
  );
};

export default FLPSlider;
