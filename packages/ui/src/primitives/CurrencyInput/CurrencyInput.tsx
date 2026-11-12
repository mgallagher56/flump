import { type ChangeEvent, type FC, useEffect, useState } from "react";
import { cx } from "../../../styled-system/css";
import { TextInput, type TextInputProps } from "../TextInput/TextInput";
import { currencyInputRecipe } from "./CurrencyInput.styles";
import {
  ALLOWED_CHARS,
  formatCurrencyInput,
  parseCurrencyInput,
  roundToPennies,
} from "./parseCurrency";

export interface CurrencyInputProps
  extends Omit<
    TextInputProps,
    "value" | "defaultValue" | "onChange" | "type" | "inputMode" | "onInvalid"
  > {
  /**
   * Controlled value. `null`, `undefined`, NaN and the infinities show an empty field.
   *
   * The parent MUST keep `null` as `null`. Never map it to 0 (`value ?? 0`): an empty field means
   * "not set", and 0 is a real amount.
   */
  value?: number | null;
  /**
   * Called with the parsed number, or `null` when the field is empty or not a number. On blur the
   * value is rounded to whole pence and emitted again if rounding changed it, so the display and
   * the model always agree.
   */
  onValueChange?: (value: number | null) => void;
  /**
   * Called with the raw text whenever non-empty text fails to parse (for example "1.2.3", or "-"
   * part-way through typing). Use it to show a FormField error; clear that error on the next
   * `onValueChange`.
   */
  onInvalid?: (raw: string) => void;
}

const toText = (value: number | null | undefined): string =>
  value === null || value === undefined ? "" : formatCurrencyInput(value);

export const CurrencyInput: FC<CurrencyInputProps> = ({
  value,
  onValueChange,
  onInvalid,
  onBlur,
  prefix = "£",
  className,
  ...rest
}) => {
  const [text, setText] = useState(() => toText(value));

  // Follow external changes, but never clobber text that already parses to the same number
  // (so "12." or "1,234.50" survive while typing).
  useEffect(() => {
    if (value === undefined) return;
    setText((current) => {
      const parsed = parseCurrencyInput(current);
      if (value === null || !Number.isFinite(value)) return parsed === null ? current : "";
      return parsed === value ? current : formatCurrencyInput(value);
    });
  }, [value]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    if (!ALLOWED_CHARS.test(raw)) return;
    setText(raw);
    const parsed = parseCurrencyInput(raw);
    if (parsed === null && raw.trim() !== "") onInvalid?.(raw);
    onValueChange?.(parsed);
  };

  return (
    <TextInput
      {...rest}
      className={cx(currencyInputRecipe(), className)}
      inputMode="decimal"
      onBlur={(event) => {
        const parsed = parseCurrencyInput(text);
        if (parsed !== null) {
          const rounded = roundToPennies(parsed);
          setText(formatCurrencyInput(rounded));
          if (rounded !== parsed) onValueChange?.(rounded);
        }
        onBlur?.(event);
      }}
      onChange={handleChange}
      prefix={prefix}
      value={text}
    />
  );
};

export default CurrencyInput;
