import { type ChangeEvent, type FocusEvent, useEffect, useState } from "react";
import { ALLOWED_CHARS, parseEnGbNumber } from "./parseCurrency";

export interface NumericTextOptions {
  value: number | null | undefined;
  onValueChange?: (value: number | null) => void;
  onInvalid?: (raw: string) => void;
  /** Display text for a number (grouping, decimals). */
  format: (value: number) => string;
  /** Rounds a parsed number to the precision the field keeps. */
  round: (value: number) => number;
  min?: number;
  max?: number;
}

const clamp = (value: number, min?: number, max?: number): number => {
  let result = value;
  if (min !== undefined && result < min) result = min;
  if (max !== undefined && result > max) result = max;
  return result;
};

/**
 * Text state shared by CurrencyInput and PercentInput. Empty stays `null` (never 0), typing keeps
 * the raw text, and blur rounds, clamps to `min`/`max` and formats with en-GB grouping.
 */
export const useNumericText = ({
  value,
  onValueChange,
  onInvalid,
  format,
  round,
  min,
  max,
}: NumericTextOptions) => {
  const toText = (v: number | null | undefined): string =>
    v === null || v === undefined ? "" : format(v);
  const [text, setText] = useState(() => toText(value));

  // Follow external changes, but never clobber text that already parses to the same number
  // (so "12." or "1,234.50" survive while typing).
  useEffect(() => {
    if (value === undefined) return;
    setText((current) => {
      const parsed = parseEnGbNumber(current);
      if (value === null || !Number.isFinite(value)) return parsed === null ? current : "";
      return parsed === value ? current : format(value);
    });
  }, [value]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    if (!ALLOWED_CHARS.test(raw)) return;
    setText(raw);
    const parsed = parseEnGbNumber(raw);
    if (parsed === null && raw.trim() !== "") onInvalid?.(raw);
    onValueChange?.(parsed);
  };

  const handleBlur = (_event: FocusEvent<HTMLInputElement>) => {
    const parsed = parseEnGbNumber(text);
    if (parsed === null) return;
    const settled = clamp(round(parsed), min, max);
    setText(format(settled));
    if (settled !== parsed) onValueChange?.(settled);
  };

  return { text, handleChange, handleBlur };
};
