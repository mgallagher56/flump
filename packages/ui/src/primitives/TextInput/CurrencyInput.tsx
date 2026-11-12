import { type ChangeEvent, type FC, useEffect, useState } from "react";
import { TextInput, type TextInputProps } from "./TextInput";

const GROUPED = /^-?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d*)?$/;
const DECIMAL_ONLY = /^-?\.\d+$/;
const ALLOWED_CHARS = /^[\d,.\s£-]*$/;

const display = new Intl.NumberFormat("en-GB", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/**
 * Parses what a person types into a money field. Empty, whitespace and anything that is not a
 * well-formed number (including "abc") give `null`, never 0.
 */
export const parseCurrencyInput = (raw: string): number | null => {
  const cleaned = raw.replace(/[£\s]/g, "");
  if (cleaned === "") return null;
  if (!GROUPED.test(cleaned) && !DECIMAL_ONLY.test(cleaned)) return null;
  const parsed = Number(cleaned.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

export interface CurrencyInputProps
  extends Omit<TextInputProps, "value" | "defaultValue" | "onChange" | "type" | "inputMode"> {
  /** Controlled value. `null` or `undefined` shows an empty field. */
  value?: number | null;
  /** Called with the parsed number, or `null` when the field is empty or not a number. */
  onValueChange?: (value: number | null) => void;
}

export const CurrencyInput: FC<CurrencyInputProps> = ({
  value,
  onValueChange,
  onBlur,
  prefix = "£",
  ...rest
}) => {
  const [text, setText] = useState(() =>
    value === null || value === undefined ? "" : display.format(value),
  );

  // Follow external changes, but never clobber text that already parses to the same number
  // (so "12." or "1,234.50" survive while typing).
  useEffect(() => {
    if (value === undefined) return;
    setText((current) => {
      const parsed = parseCurrencyInput(current);
      if (value === null) return parsed === null ? current : "";
      return parsed === value ? current : display.format(value);
    });
  }, [value]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    if (!ALLOWED_CHARS.test(raw)) return;
    setText(raw);
    onValueChange?.(parseCurrencyInput(raw));
  };

  return (
    <TextInput
      {...rest}
      inputMode="decimal"
      onBlur={(event) => {
        const parsed = parseCurrencyInput(text);
        if (parsed !== null) setText(display.format(parsed));
        onBlur?.(event);
      }}
      onChange={handleChange}
      prefix={prefix}
      value={text}
    />
  );
};

export default CurrencyInput;
