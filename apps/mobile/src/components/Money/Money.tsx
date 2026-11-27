import { formatCurrency } from "@flump/format";
import { useMemo } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import { Text } from "../Text";
import { createStyles, type MoneyColor, type MoneySize, SIZE_TEXT } from "./Money.styles";

export interface MoneyProps {
  /** Pounds. `null` is unknown and shows "Not set", never £0. */
  value: number | null;
  /** Defaults to `md`. */
  size?: MoneySize;
  /** Defaults to `primary`. */
  color?: MoneyColor;
  /** A change: "+£2,575" for a rise, "-£300" for a fall, as web's `signDisplay: "always"`. */
  signed?: boolean;
  /** 0 (whole pounds, default) or 2 (pence, where an exact amount is edited). */
  fractionDigits?: 0 | 2;
  testID?: string;
}

/** Pounds formatted to 0 or 2 decimal places: £1,205 or £12.34, "Not set" for null. */
export function formatPounds(value: number | null, fractionDigits: 0 | 2 = 0): string {
  return formatCurrency(value, "GBP", { fractionDigits });
}

/** Whole pounds as the app reads them: £1,205 for 1204.5, "Not set" for null. */
export function formatWholePounds(value: number | null): string {
  return formatPounds(value, 0);
}

/** "+£2,575" and "-£300": a change with its sign, as web's Money with `signDisplay: "always"`. */
function formatSignedPounds(value: number | null, fractionDigits: 0 | 2 = 0): string {
  const text = formatPounds(value, fractionDigits);
  return value === null || text.startsWith("-") ? text : `+${text}`;
}

/** How a screen reader hears a figure: "minus £300", and "plus £2,575" for a signed rise. */
export function spokenPounds(value: number | null, signed = false): string {
  const text = signed ? formatSignedPounds(value) : formatWholePounds(value);
  return text.replace(/^-/, "minus ").replace(/^\+/, "plus ");
}

/** A figure in pounds with tabular numerals, the same colour whatever its sign. */
export function Money({
  value,
  size = "md",
  color = "primary",
  signed = false,
  fractionDigits = 0,
  testID,
}: MoneyProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <Text textStyle={SIZE_TEXT[size]} color={color} style={styles.figure} testID={testID}>
      {signed ? formatSignedPounds(value, fractionDigits) : formatPounds(value, fractionDigits)}
    </Text>
  );
}
