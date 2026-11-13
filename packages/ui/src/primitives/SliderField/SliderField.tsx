import {
  type ChangeEvent,
  type FC,
  type FocusEvent,
  type KeyboardEvent,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cx } from "../../../styled-system/css";
import { formatMoney, formatNumber } from "../Money/Money";
import {
  sliderFieldContainer,
  sliderFieldHeader,
  sliderFieldLabel,
  sliderFieldValuePill,
  sliderHelperText,
  sliderInputTrack,
  sliderPillAffix,
  sliderPillInput,
} from "./SliderField.styles";

export type SliderFieldFormat = "number" | "currency" | "percent";

export interface SliderFieldProps {
  label: string;
  /** Current value. `null` or `undefined` renders an empty pill (not set); the range sits at `min`. */
  value: number | null | undefined;
  min: number;
  max: number;
  step?: number;
  /**
   * How the value is formatted and parsed (en-GB): `currency` shows a pound sign, `percent` shows
   * a percent sign (the value is a percentage figure, 4.5 means 4.5%). Defaults to `number`.
   */
  format?: SliderFieldFormat;
  /** Decimal places shown in the pill. Defaults to the decimals in `step` or the value. */
  fractionDigits?: number;
  /** Fixed text before the value in the pill (plain `number` format only), for example "£". */
  unitPrefix?: string;
  /** Fixed text after the value in the pill (plain `number` format only), for example "/mo". */
  unitSuffix?: string;
  /** Formats the value for assistive tech (aria-valuetext). Defaults to the pill format. */
  formatValue?: (value: number) => string;
  helperText?: string;
  onChange: (value: number) => void;
  /** Called when the pill is blurred while empty. */
  onClear?: () => void;
  className?: string;
  disabled?: boolean;
}

const decimalsOf = (n: number): number => {
  const text = String(n);
  const dot = text.indexOf(".");
  return dot === -1 ? 0 : text.length - dot - 1;
};

/** Parses en-GB typed entry: strips currency and percent signs, grouping commas and spaces. */
export const parseSliderEntry = (text: string): number | null => {
  const cleaned = text.replace(/[£%,\s]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const SliderField: FC<SliderFieldProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  format = "number",
  fractionDigits,
  unitPrefix = "",
  unitSuffix = "",
  formatValue,
  helperText,
  onChange,
  onClear,
  className,
  disabled,
}) => {
  const inputId = useId();
  const helperId = useId();
  const rangeRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const known = typeof value === "number" && Number.isFinite(value);

  const formatBare = (n: number): string => {
    const digits = Math.min(fractionDigits ?? Math.max(decimalsOf(step), decimalsOf(n)), 6);
    if (format === "currency") {
      return formatMoney(n, { fractionDigits: digits > 0 ? 2 : 0 }).text;
    }
    if (format === "percent") {
      return formatNumber(n, { kind: "percent", fractionDigits: digits }).text;
    }
    return formatNumber(n, { fractionDigits: digits }).text;
  };

  const display = known ? formatBare(value) : "";
  const valueText = known
    ? formatValue
      ? formatValue(value)
      : `${unitPrefix}${formatBare(value)}${unitSuffix}`
    : "Not set";

  useLayoutEffect(() => {
    const el = rangeRef.current;
    if (!el) return;
    const current = known ? clamp(value, min, max) : min;
    const span = max - min;
    const pct = span > 0 ? ((current - min) / span) * 100 : 0;
    el.style.setProperty("--slider-fill", `${pct}%`);
  }, [known, value, min, max]);

  const handleSliderChange = (e: ChangeEvent<HTMLInputElement>) => {
    setDraft(null);
    onChange(Number(e.target.value));
  };

  // Arrow keys step by `step`, PageUp/PageDown by a tenth of the range, Home/End jump to the ends.
  // Handled explicitly (the native range behaviour matches) so it is identical in every browser
  // and testable.
  const handleSliderKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled || e.altKey || e.ctrlKey || e.metaKey) return;
    const current = known ? clamp(value, min, max) : min;
    const page = Math.max(step, Math.round((max - min) / 10 / step) * step);
    let next: number | undefined;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowUp":
        next = current + step;
        break;
      case "ArrowLeft":
      case "ArrowDown":
        next = current - step;
        break;
      case "PageUp":
        next = current + page;
        break;
      case "PageDown":
        next = current - page;
        break;
      case "Home":
        next = min;
        break;
      case "End":
        next = max;
        break;
      default:
        return;
    }
    e.preventDefault();
    const places = Math.max(decimalsOf(step), decimalsOf(min));
    const rounded = Number(clamp(next, min, max).toFixed(places));
    setDraft(null);
    if (rounded !== value) onChange(rounded);
  };

  const handlePillChange = (e: ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setDraft(text);
    const parsed = parseSliderEntry(text);
    // Only in-range entries apply live; out-of-range entries clamp on blur.
    if (parsed !== null && parsed >= min && parsed <= max) onChange(parsed);
  };

  const handlePillFocus = (e: FocusEvent<HTMLInputElement>) => {
    // Edit the plain number without symbols or grouping.
    setDraft(known ? String(value) : "");
    const el = e.currentTarget;
    requestAnimationFrame(() => el.select());
  };

  const handlePillBlur = () => {
    if (draft === null) return;
    const parsed = parseSliderEntry(draft);
    if (parsed === null) {
      // Empty stays empty: never coerce a blank pill to 0.
      if (draft.trim() === "") onClear?.();
      setDraft(null);
      return;
    }
    const clamped = clamp(parsed, min, max);
    if (clamped !== value) onChange(clamped);
    setDraft(null);
  };

  const showAffixes = format === "number";

  return (
    <div className={cx(sliderFieldContainer(), className)}>
      <div className={sliderFieldHeader()}>
        <label className={sliderFieldLabel()} htmlFor={inputId}>
          {label}
        </label>
        <div className={sliderFieldValuePill({ disabled: !!disabled })}>
          {showAffixes && unitPrefix && <span className={sliderPillAffix()}>{unitPrefix}</span>}
          <input
            aria-label={`${label} input`}
            autoComplete="off"
            className={sliderPillInput()}
            data-focus-managed=""
            disabled={disabled}
            inputMode={min < 0 || decimalsOf(step) > 0 ? "decimal" : "numeric"}
            placeholder="Not set"
            type="text"
            value={draft ?? display}
            onBlur={handlePillBlur}
            onChange={handlePillChange}
            onFocus={handlePillFocus}
          />
          {showAffixes && unitSuffix && <span className={sliderPillAffix()}>{unitSuffix}</span>}
        </div>
      </div>

      <input
        ref={rangeRef}
        aria-describedby={helperText ? helperId : undefined}
        aria-label={`${label} range slider`}
        aria-valuetext={valueText}
        className={sliderInputTrack()}
        disabled={disabled}
        id={inputId}
        max={max}
        min={min}
        step={step}
        type="range"
        value={known ? clamp(value, min, max) : min}
        onChange={handleSliderChange}
        onKeyDown={handleSliderKeyDown}
      />

      {helperText && (
        <span className={sliderHelperText()} id={helperId}>
          {helperText}
        </span>
      )}
    </div>
  );
};

export default SliderField;
