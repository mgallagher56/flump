import type { FC } from "react";
import { cx } from "../../../styled-system/css";
import { useNumericText } from "../CurrencyInput/useNumericText";
import { TextInput, type TextInputProps } from "../TextInput/TextInput";
import { wholeNumberInputRecipe } from "./WholeNumberInput.styles";

/** Digits and spaces only: no sign, decimal point, grouping comma or symbol. */
export const WHOLE_NUMBER_CHARS = /^[\d\s]*$/;

export interface WholeNumberInputProps
  extends Omit<
    TextInputProps,
    "value" | "defaultValue" | "onChange" | "type" | "inputMode" | "onInvalid"
  > {
  /**
   * Controlled whole number, for an age, a year, a count of years or a day of the month.
   * `null`, `undefined` and NaN show an empty field. Keep `null` as `null`; never map it to 0.
   */
  value?: number | null;
  /** Parsed number, or `null` when empty or not a number. On blur it is rounded and clamped. */
  onValueChange?: (value: number | null) => void;
  /** Raw text that failed to parse; show a FormField error and clear it on the next change. */
  onInvalid?: (raw: string) => void;
  /** Optional lower bound: a value below it is reported through `onInvalid` on blur, not raised. */
  min?: number;
  /** Optional upper bound: a keystroke that would go above it is not taken, and is reported. */
  max?: number;
}

const formatWhole = (value: number): string =>
  Number.isFinite(value) ? String(Math.round(value)) : "";

/**
 * A field for a whole number with no grouping (ages, years, counts). Shares the typing rules of
 * CurrencyInput and PercentInput: a leading zero is dropped as you type ("0840" shows "840") and an
 * empty field is `null`, never 0.
 */
export const WholeNumberInput: FC<WholeNumberInputProps> = ({
  value,
  onValueChange,
  onInvalid,
  onBlur,
  min,
  max,
  className,
  ...rest
}) => {
  const { text, handleChange, handleBlur } = useNumericText({
    value,
    onValueChange,
    onInvalid,
    format: formatWhole,
    round: Math.round,
    min,
    max,
    allowed: WHOLE_NUMBER_CHARS,
    symbol: "",
    // Bounds hold as you type: a digit that would go above `max` is not taken, and a value below
    // `min` is reported on blur rather than raised, so the field never changes what was typed.
    rejectAboveMax: true,
    belowMin: "report",
  });

  return (
    <TextInput
      {...rest}
      className={cx(wholeNumberInputRecipe(), className)}
      inputMode="numeric"
      onBlur={(event) => {
        handleBlur(event);
        onBlur?.(event);
      }}
      onChange={handleChange}
      value={text}
    />
  );
};

export default WholeNumberInput;
