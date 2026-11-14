import {
  type ChangeEvent,
  type FocusEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { parseEnGbNumber } from "./parseCurrency";

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
  /** Characters the field accepts; anything else is rejected and reported through `onInvalid`. */
  allowed: RegExp;
  /** The one symbol this field accepts and strips when parsing ("£" or "%"). */
  symbol: string;
  /** Regroup thousands while typing ("1234" shows "1,234"), keeping the caret in place. */
  groupWhileTyping?: boolean;
}

const TYPED_NUMBER = /^(\s*[£]?\s*-?)([\d,]*)(\.\d*)?(\s*)$/;

/**
 * "12345.6" to "12,345.6": regroups the whole-number part of what was typed and leaves the rest
 * (a trailing ".", the pence typed so far) exactly as it is. Text that is not a plain number is
 * returned unchanged.
 */
export const groupTypedNumber = (raw: string): string => {
  const match = TYPED_NUMBER.exec(raw);
  if (!match) return raw;
  const [, lead = "", whole = "", decimals = "", trail = ""] = match;
  const digits = whole.replace(/,/g, "");
  if (digits === "") return raw;
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${lead}${grouped}${decimals}${trail}`;
};

/**
 * Where the caret goes after regrouping: after the same number of characters other than the
 * thousands commas as before, so a caret after a typed "." stays after it ("1234.|" -> "1,234.|").
 */
export const caretAfterGrouping = (grouped: string, charsBefore: number): number => {
  if (charsBefore <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < grouped.length; i += 1) {
    if (grouped[i] !== ",") seen += 1;
    if (seen === charsBefore) return i + 1;
  }
  return grouped.length;
};

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
  allowed,
  symbol,
  groupWhileTyping = false,
}: NumericTextOptions) => {
  const toText = (v: number | null | undefined): string =>
    v === null || v === undefined ? "" : format(v);
  const [text, setText] = useState(() => toText(value));
  // The caret to restore after a regrouped value is written, set before the next keystroke can
  // land (a layout effect runs straight after React commits; a frame later is too late).
  const pendingCaret = useRef<{ input: HTMLInputElement; position: number } | null>(null);
  useLayoutEffect(() => {
    const pending = pendingCaret.current;
    if (!pending) return;
    pendingCaret.current = null;
    if (document.activeElement === pending.input) {
      pending.input.setSelectionRange(pending.position, pending.position);
    }
  }, [text]);

  // Follow external changes, but never clobber text that already parses to the same number
  // (so "12." or "1,234.50" survive while typing).
  useEffect(() => {
    if (value === undefined) return;
    setText((current) => {
      const parsed = parseEnGbNumber(current, symbol);
      if (value === null || !Number.isFinite(value)) return parsed === null ? current : "";
      return parsed === value ? current : format(value);
    });
  }, [value]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    if (!allowed.test(raw)) {
      onInvalid?.(raw);
      return;
    }
    let next = raw;
    if (groupWhileTyping) {
      const input = event.target;
      const caret = input.selectionStart ?? raw.length;
      const charsBefore = raw.slice(0, caret).replace(/,/g, "").length;
      next = groupTypedNumber(raw);
      if (next !== raw) {
        pendingCaret.current = { input, position: caretAfterGrouping(next, charsBefore) };
      }
    }
    setText(next);
    const parsed = parseEnGbNumber(next, symbol);
    if (parsed === null && raw.trim() !== "") onInvalid?.(raw);
    onValueChange?.(parsed);
  };

  const handleBlur = (_event: FocusEvent<HTMLInputElement>) => {
    const parsed = parseEnGbNumber(text, symbol);
    if (parsed === null) return;
    const settled = clamp(round(parsed), min, max);
    setText(format(settled));
    if (settled !== parsed) onValueChange?.(settled);
  };

  return { text, handleChange, handleBlur };
};
