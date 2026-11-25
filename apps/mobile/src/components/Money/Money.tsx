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
  testID?: string;
}

/** Whole pounds as the app reads them: £1,205 for 1204.5, "Not set" for null. */
export function formatWholePounds(value: number | null): string {
  return formatCurrency(value === null ? null : Math.round(value));
}

/** A figure in whole pounds with tabular numerals, the same colour whatever its sign. */
export function Money({ value, size = "md", color = "primary", testID }: MoneyProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <Text textStyle={SIZE_TEXT[size]} color={color} style={styles.figure} testID={testID}>
      {formatWholePounds(value)}
    </Text>
  );
}
