import { type ChangeEvent, type FC, useId } from "react";
import { cx } from "../../../styled-system/css";
import {
  sliderFieldContainer,
  sliderFieldHeader,
  sliderFieldLabel,
  sliderFieldValuePill,
  sliderHelperText,
  sliderInputTrack,
  sliderPillInput,
} from "./SliderField.styles";

export interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unitPrefix?: string;
  unitSuffix?: string;
  /** Formats the value for assistive tech (aria-valuetext). Defaults to en-GB number formatting with unitPrefix/unitSuffix. */
  formatValue?: (value: number) => string;
  helperText?: string;
  onChange: (value: number) => void;
  className?: string;
  disabled?: boolean;
}

const numberFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 6 });

export const SliderField: FC<SliderFieldProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  unitPrefix = "",
  unitSuffix = "",
  formatValue,
  helperText,
  onChange,
  className,
  disabled,
}) => {
  const inputId = useId();
  const valueText = formatValue
    ? formatValue(value)
    : `${unitPrefix}${numberFormat.format(value)}${unitSuffix}`;

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
            className={sliderPillInput()}
            data-focus-managed=""
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
        aria-valuetext={valueText}
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

      {helperText && <span className={sliderHelperText()}>{helperText}</span>}
    </div>
  );
};

export default SliderField;
