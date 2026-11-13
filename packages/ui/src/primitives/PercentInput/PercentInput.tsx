import type { FC } from "react";
import { cx } from "../../../styled-system/css";
import { formatEnGbNumber, roundToDecimals } from "../CurrencyInput/parseCurrency";
import { useNumericText } from "../CurrencyInput/useNumericText";
import { TextInput, type TextInputProps } from "../TextInput/TextInput";
import { percentInputRecipe } from "./PercentInput.styles";

export interface PercentInputProps
  extends Omit<
    TextInputProps,
    "value" | "defaultValue" | "onChange" | "type" | "inputMode" | "onInvalid"
  > {
  /**
   * Controlled percentage figure: 4.5 means 4.5%, not a ratio. `null`, `undefined` and NaN show an
   * empty field. Keep `null` as `null`; never map it to 0.
   */
  value?: number | null;
  /** Parsed number, or `null` when empty or not a number. On blur it is rounded and clamped. */
  onValueChange?: (value: number | null) => void;
  /** Raw text that failed to parse; show a FormField error and clear it on the next change. */
  onInvalid?: (raw: string) => void;
  /** Optional lower bound applied on blur, for example 0. */
  min?: number;
  /** Optional upper bound applied on blur, for example 100. */
  max?: number;
  /** Decimal places kept (default 2). */
  decimals?: number;
}

export const PercentInput: FC<PercentInputProps> = ({
  value,
  onValueChange,
  onInvalid,
  onBlur,
  min,
  max,
  decimals = 2,
  suffix = "%",
  className,
  ...rest
}) => {
  const { text, handleChange, handleBlur } = useNumericText({
    value,
    onValueChange,
    onInvalid,
    format: (v) => formatEnGbNumber(v, decimals),
    round: (v) => roundToDecimals(v, decimals),
    min,
    max,
  });

  return (
    <TextInput
      {...rest}
      className={cx(percentInputRecipe(), className)}
      inputMode="decimal"
      onBlur={(event) => {
        handleBlur(event);
        onBlur?.(event);
      }}
      onChange={handleChange}
      suffix={suffix}
      value={text}
    />
  );
};

export default PercentInput;
