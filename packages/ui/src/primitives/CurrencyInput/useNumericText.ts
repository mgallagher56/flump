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

/** A whole-number part with no commas, or with commas exactly every three digits. */
const VALID_WHOLE = /^(\d*|\d{1,3}(,\d{3})+)$/;

const wholePart = (text: string): string | null => {
  const match = TYPED_NUMBER.exec(text);
  return match ? (match[2] ?? "") : null;
};

/**
 * Whether to regroup what was typed. Yes when it is already a validly grouped number, or when one
 * digit was typed into (or one character deleted from) a validly grouped number. No otherwise, so a
 * comma typed as a decimal point ("1,5") or pasted text with stray commas stays as typed and is
 * reported invalid rather than read as a different number.
 */
export const shouldRegroup = (raw: string, previous: string): boolean => {
  const whole = wholePart(raw);
  if (whole === null) return false;
  if (VALID_WHOLE.test(whole)) return true;
  const before = wholePart(previous);
  if (before === null || !VALID_WHOLE.test(before)) return false;
  if (raw.length === previous.length - 1) return true;
  if (raw.length !== previous.length + 1) return false;
  let i = 0;
  while (i < previous.length && raw[i] === previous[i]) i += 1;
  return /\d/.test(raw[i] ?? "");
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
  // land (a layout effect runs straight after React commits; a frame later is too late). The tick
  // makes the effect run even when regrouping leaves the text as it was.
  const pendingCaret = useRef<{ input: HTMLInputElement; position: number } | null>(null);
  const [caretTick, setCaretTick] = useState(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs after each text or caret change.
  useLayoutEffect(() => {
    const pending = pendingCaret.current;
    if (!pending) return;
    pendingCaret.current = null;
    if (document.activeElement === pending.input) {
      pending.input.setSelectionRange(pending.position, pending.position);
    }
  }, [text, caretTick]);

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
    // A caret queued by an earlier key never applies to this one.
    pendingCaret.current = null;
    let next = raw;
    if (groupWhileTyping) {
      const input = event.target;
      const caret = input.selectionStart ?? raw.length;
      let source = raw;
      let sourceCaret = caret;
      let regroup = shouldRegroup(raw, text);
      // Backspace or Delete on a thousands comma removed only the comma, which regrouping would
      // put straight back: remove the digit beside it instead, as the person meant.
      if (
        raw.length === text.length - 1 &&
        raw.replace(/,/g, "") === text.replace(/,/g, "") &&
        text[caret] === ","
      ) {
        const backward =
          (event.nativeEvent as InputEvent | undefined)?.inputType !== "deleteContentForward";
        const at = backward ? caret - 1 : caret;
        if (at >= 0 && at < raw.length) {
          source = raw.slice(0, at) + raw.slice(at + 1);
          sourceCaret = at;
          regroup = true;
        }
      }
      if (regroup) {
        next = groupTypedNumber(source);
        if (next !== raw) {
          const charsBefore = source.slice(0, sourceCaret).replace(/,/g, "").length;
          pendingCaret.current = { input, position: caretAfterGrouping(next, charsBefore) };
          setCaretTick((tick) => tick + 1);
        }
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
