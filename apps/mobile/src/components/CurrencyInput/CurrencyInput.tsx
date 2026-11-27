import { formatCurrency } from "@flump/format";
import { useEffect, useMemo, useRef, useState } from "react";
// Raw React Native inputs are allowed inside src/components (biome.json, apps/mobile override).
import { Platform, TextInput, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { Text } from "../Text";
import { createStyles } from "./CurrencyInput.styles";

export interface CurrencyInputProps {
  /** Pounds, or `null` for blank. Blank is never 0. */
  value: number | null;
  /**
   * Called on every change with the parsed amount, or `null` while the text is blank or invalid,
   * and the text as typed, so a form can tell blank from an amount it cannot read.
   */
  onValueChange(value: number | null, text: string): void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  /** Defaults to true. */
  editable?: boolean;
  /**
   * A balance that can go below zero (an overdrawn current account, as web's balance field takes).
   * Off by default: an amount owed, a payment or a limit is never negative.
   */
  allowNegative?: boolean;
  testID?: string;
  onSubmitEditing?: () => void;
}

const AMOUNT = /^(\d+(\.\d{0,2})?|\.\d{1,2})$/;
/** A leading minus, or the typographic one, before or after the "£". */
const MINUS = /^[-\u2212]/;

/**
 * Reads a typed amount in pounds. Tolerant of "£", commas, spaces and surrounding blanks; at most
 * two decimal places. Blank, non-numeric or three or more decimals give `null`, and so does a
 * negative amount unless `allowNegative` is set.
 */
export function parseMoneyInput(text: string, allowNegative = false): number | null {
  const plain = text.trim().replace(/[£,\s]/g, "");
  const negative = MINUS.test(plain);
  if (negative && !allowNegative) return null;
  const digits = negative ? plain.slice(1) : plain;
  if (!AMOUNT.test(digits)) return null;
  const value = Number(digits);
  return negative && value !== 0 ? -value : value;
}

/** The amount as the field shows it after editing: "1,204.50" or "1,204". The prefix shows the "£". */
function display(value: number): string {
  const hasPence = Math.round(value * 100) % 100 !== 0;
  return formatCurrency(value, "GBP", { fractionDigits: hasPence ? 2 : 0 }).replace("£", "");
}

/**
 * An amount in pounds, typed on the decimal keypad. It keeps the words as typed while editing and
 * tidies a valid amount when focus leaves. No placeholder: the label says what to enter.
 */
export function CurrencyInput({
  value,
  onValueChange,
  accessibilityLabel,
  accessibilityHint,
  editable = true,
  allowNegative = false,
  testID,
  onSubmitEditing,
}: CurrencyInputProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [text, setText] = useState(() => (value === null ? "" : display(value)));
  const [focused, setFocused] = useState(false);
  // The last value this field reported, so its own changes coming back as `value` leave the text alone.
  const reported = useRef<number | null>(value);

  useEffect(() => {
    if (value === reported.current) return;
    reported.current = value;
    setText(value === null ? "" : display(value));
  }, [value]);

  const handleChange = (next: string) => {
    setText(next);
    const parsed = parseMoneyInput(next, allowNegative);
    reported.current = parsed;
    onValueChange(parsed, next);
  };

  const handleBlur = () => {
    setFocused(false);
    const parsed = parseMoneyInput(text, allowNegative);
    if (parsed !== null) setText(display(parsed));
  };

  // A gallery preview draws the scale itself, so the phone's setting must not multiply it again.
  const preview = theme.textScale !== 1;

  return (
    <View style={[styles.box, focused ? styles.focused : null, editable ? null : styles.disabled]}>
      <Text
        color="secondary"
        tabular
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        £
      </Text>
      <TextInput
        value={text}
        onChangeText={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={handleBlur}
        onSubmitEditing={onSubmitEditing}
        // Neither decimal pad has a minus key, so a balance that can be negative gets a keyboard
        // with one: iOS's numbers and punctuation, Android's signed decimal numbers. `inputMode`
        // would override the choice, so it is set only for the plain decimal pad.
        keyboardType={
          allowNegative
            ? Platform.OS === "ios"
              ? "numbers-and-punctuation"
              : "numeric"
            : "decimal-pad"
        }
        {...(allowNegative ? {} : { inputMode: "decimal" as const })}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: !editable }}
        editable={editable}
        {...(preview ? { allowFontScaling: false } : {})}
        style={styles.input}
        testID={testID}
      />
    </View>
  );
}
