import {
  type ChangeEvent,
  type CSSProperties,
  type FC,
  type FocusEvent,
  type KeyboardEvent,
  useEffect,
  useId,
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
const PLAIN_NUMBER = /^-?\d+(\.\d+)?$/;
// Commas are only accepted as thousands grouping ("1,250" yes, "1,5" no).
const GROUPED_NUMBER = /^-?\d{1,3}(,\d{3})+(\.\d+)?$/;

export const parseSliderEntry = (text: string): number | null => {
  const cleaned = text.replace(/[£%\s]/g, "");
  if (!PLAIN_NUMBER.test(cleaned) && !GROUPED_NUMBER.test(cleaned)) return null;
  const parsed = Number(cleaned.replace(/,/g, ""));
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
  const selectFrame = useRef<number | null>(null);
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

  const cancelSelect = () => {
    if (selectFrame.current !== null) cancelAnimationFrame(selectFrame.current);
    selectFrame.current = null;
  };
  useEffect(() => cancelSelect, []);

  // The filled part of the track is driven by a custom property in the style attribute (same
  // approach as ProgressBar's dynamic width). Rendering it with the element, rather than from an
  // effect, means server-rendered markup already has the right fill and nothing flashes.
  const current = known ? clamp(value, min, max) : min;
  const span = max - min;
  const fillPct = span > 0 ? ((current - min) / span) * 100 : 0;
  const fillStyle = { "--slider-fill": `${fillPct}%` } as CSSProperties;

  const handleSliderChange = (e: ChangeEvent<HTMLInputElement>) => {
    setDraft(null);
    onChange(Number(e.target.value));
  };

  // Arrow keys step by `step`, PageUp/PageDown by a tenth of the range, Home/End jump to the ends.
  // Handled explicitly (the native range behaviour matches) so it is identical in every browser
  // and testable.
  const handleSliderKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled || e.altKey || e.ctrlKey || e.metaKey) return;
    const page = Math.max(step, Math.round((max - min) / 10 / step) * step);
    let next: number;
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
    const initial = known ? String(value) : "";
    setDraft(initial);
    const el = e.currentTarget;
    cancelSelect();
    selectFrame.current = requestAnimationFrame(() => {
      selectFrame.current = null;
      // Only select the untouched text: never swallow characters the user has already typed.
      if (el.value === initial) el.select();
    });
  };

  const handlePillBlur = () => {
    cancelSelect();
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
        aria-describedby={helperText ? helperId : undefined}
        aria-label={`${label} range slider`}
        aria-valuetext={valueText}
        className={sliderInputTrack()}
        disabled={disabled}
        id={inputId}
        max={max}
        min={min}
        step={step}
        style={fillStyle}
        type="range"
        value={current}
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
