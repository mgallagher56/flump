import { type ChangeEvent, type FC, useId } from "react";
import { css, cx } from "../../../styled-system/css";
import {
  sliderFieldContainer,
  sliderFieldHeader,
  sliderFieldLabel,
  sliderFieldValuePill,
  sliderInputTrack,
} from "./SliderField.styles";

export interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unitPrefix?: string;
  unitSuffix?: string;
  helperText?: string;
  onChange: (value: number) => void;
  className?: string;
  disabled?: boolean;
}

export const SliderField: FC<SliderFieldProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  unitPrefix = "",
  unitSuffix = "",
  helperText,
  onChange,
  className,
  disabled,
}) => {
  const inputId = useId();

  const handleSliderChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value));
  };

  const handlePillChange = (e: ChangeEvent<HTMLInputElement>) => {
    const parsed = Number(e.target.value);
    if (!Number.isNaN(parsed)) {
      const clamped = Math.min(max, Math.max(min, parsed));
      onChange(clamped);
    }
  };

  return (
    <div className={cx(sliderFieldContainer(), className)}>
      <div className={sliderFieldHeader()}>
        <label className={sliderFieldLabel()} htmlFor={inputId}>
          {label}
        </label>
        <div className={sliderFieldValuePill()}>
          {unitPrefix && <span>{unitPrefix}</span>}
          <input
            aria-label={`${label} input`}
            className={css({
              width: "56px",
              textAlign: "right",
              border: "none",
              backgroundColor: "transparent",
              color: "primary",
              fontWeight: "bold",
              fontSize: "xs",
              fontVariantNumeric: "tabular-nums",
              p: "0",
              outline: "none",
            })}
            disabled={disabled}
            max={max}
            min={min}
            step={step}
            type="number"
            value={value}
            onChange={handlePillChange}
          />
          {unitSuffix && <span>{unitSuffix}</span>}
        </div>
      </div>

      <input
        aria-label={`${label} range slider`}
        className={sliderInputTrack()}
        disabled={disabled}
        id={inputId}
        max={max}
        min={min}
        step={step}
        type="range"
        value={value}
        onChange={handleSliderChange}
      />

      {helperText && (
        <span className={css({ fontSize: "xs", color: "text.muted", lineHeight: "1.3" })}>
          {helperText}
        </span>
      )}
    </div>
  );
};

export default SliderField;
