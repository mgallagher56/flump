import { type ChangeEvent, type FC, useEffect, useState } from "react";
import { ALLOWED_CHARS, formatCurrencyInput, parseCurrencyInput } from "./parseCurrency";
import { TextInput, type TextInputProps } from "./TextInput";

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
    value === null || value === undefined ? "" : formatCurrencyInput(value),
  );

  // Follow external changes, but never clobber text that already parses to the same number
  // (so "12." or "1,234.50" survive while typing).
  useEffect(() => {
    if (value === undefined) return;
    setText((current) => {
      const parsed = parseCurrencyInput(current);
      if (value === null) return parsed === null ? current : "";
      return parsed === value ? current : formatCurrencyInput(value);
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
        if (parsed !== null) setText(formatCurrencyInput(parsed));
        onBlur?.(event);
      }}
      onChange={handleChange}
      prefix={prefix}
      value={text}
    />
  );
};

export default CurrencyInput;
