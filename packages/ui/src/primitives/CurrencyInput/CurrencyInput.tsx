import type { FC } from "react";
import { cx } from "../../../styled-system/css";
import { TextInput, type TextInputProps } from "../TextInput/TextInput";
import { currencyInputRecipe } from "./CurrencyInput.styles";
import { formatCurrencyInput, MONEY_CHARS, roundToPennies } from "./parseCurrency";
import { useNumericText } from "./useNumericText";

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
   * value is rounded to whole pence, clamped to `min`/`max` and emitted again if that changed it,
   * so the display and the model always agree.
   */
  onValueChange?: (value: number | null) => void;
  /**
   * Called with the raw text whenever non-empty text fails to parse (for example "1.2.3", or "-"
   * part-way through typing). Use it to show a FormField error; clear that error on the next
   * `onValueChange`.
   */
  onInvalid?: (raw: string) => void;
  /** Optional lower bound applied on blur (typing is never blocked). */
  min?: number;
  /** Optional upper bound applied on blur. */
  max?: number;
}

export const CurrencyInput: FC<CurrencyInputProps> = ({
  value,
  onValueChange,
  onInvalid,
  onBlur,
  min,
  max,
  prefix = "£",
  className,
  ...rest
}) => {
  const { text, handleChange, handleBlur } = useNumericText({
    value,
    onValueChange,
    onInvalid,
    format: formatCurrencyInput,
    round: roundToPennies,
    min,
    max,
    allowed: MONEY_CHARS,
    symbol: "£",
  });

  return (
    <TextInput
      {...rest}
      className={cx(currencyInputRecipe(), className)}
      inputMode="decimal"
      onBlur={(event) => {
        handleBlur(event);
        onBlur?.(event);
      }}
      onChange={handleChange}
      prefix={prefix}
      value={text}
    />
  );
};

export default CurrencyInput;
