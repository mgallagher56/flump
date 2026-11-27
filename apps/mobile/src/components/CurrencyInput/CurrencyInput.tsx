import { formatCurrency } from "@flump/format";
import { useEffect, useMemo, useRef, useState } from "react";
// Raw React Native inputs are allowed inside src/components (biome.json, apps/mobile override).
import { Platform, TextInput, View } from "react-native";
import { useScrollFieldIntoView } from "../../device/keyboardInset";
import { useTheme } from "../../theme/ThemeProvider";
import { useFieldName } from "../FormField/FormField";
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

/** Characters a typed amount may carry that are not part of the number. */
const IGNORED = new Set(["£", ",", " ", "\t", "\n", "\r", "\u00a0"]);
/** A leading minus, or the typographic one. */
const MINUS = new Set(["-", "\u2212"]);
const isDigit = (c: string) => c >= "0" && c <= "9";

/**
 * Whether `digits` is a plain amount: digits with at most one point and at most two decimals after
 * it, or a point with one or two decimals (".5"). Read one character at a time, with no regular
 * expression, so no typed text can make the check slow.
 */
function isAmount(digits: string): boolean {
  const point = digits.indexOf(".");
  const whole = point < 0 ? digits : digits.slice(0, point);
  const pence = point < 0 ? "" : digits.slice(point + 1);
  if (![...whole].every(isDigit) || ![...pence].every(isDigit)) return false;
  if (pence.length > 2) return false;
  // "12." is still being typed and reads as 12; "." alone and "" are not amounts.
  return point < 0 ? whole.length > 0 : whole.length > 0 || pence.length > 0;
}

/**
 * Reads a typed amount in pounds. Tolerant of "£", commas, spaces and surrounding blanks; at most
 * two decimal places. Blank, non-numeric or three or more decimals give `null`, and so does a
 * negative amount unless `allowNegative` is set.
 */
export function parseMoneyInput(text: string, allowNegative = false): number | null {
  const plain = [...text].filter((c) => !IGNORED.has(c)).join("");
  const negative = plain.length > 0 && MINUS.has(plain.charAt(0));
  if (negative && !allowNegative) return null;
  const digits = negative ? plain.slice(1) : plain;
  if (!isAmount(digits)) return null;
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
  const spokenName = useFieldName(accessibilityLabel);
  // In a form, the field scrolls above the keyboard when it gains focus.
  const showField = useScrollFieldIntoView();
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
        onFocus={() => {
          setFocused(true);
          showField();
        }}
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
        accessibilityLabel={spokenName}
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
