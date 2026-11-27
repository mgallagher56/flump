import { useEffect, useMemo, useRef, useState } from "react";
// Raw React Native inputs are allowed inside src/components (biome.json, apps/mobile override).
import { TextInput, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { Text } from "../Text";
import { createStyles } from "./WholeNumberInput.styles";

export interface WholeNumberInputProps {
  /** A whole number, 0 or more, or `null` for blank. Blank is never 0. */
  value: number | null;
  /** Called on every change with the parsed number, or `null` while blank or invalid. */
  onValueChange(value: number | null, text: string): void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  /** A word after the number, such as "years". Screen readers skip it: the label says it. */
  suffix?: string;
  /** Defaults to true. */
  editable?: boolean;
  testID?: string;
  onSubmitEditing?: () => void;
}

const WHOLE = /^\d+$/;

/**
 * Reads a typed whole number, 0 or more. Tolerant of spaces. Blank, negative, decimal or
 * non-numeric text gives `null`. It does not clamp: the form checks the bounds.
 */
export function parseWholeNumberInput(text: string): number | null {
  const plain = text.replace(/\s/g, "");
  if (!WHOLE.test(plain)) return null;
  const parsed = Number(plain);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

/**
 * A whole number, such as years or months, typed on the number pad, with an optional word after it
 * that screen readers skip. No placeholder: the label says what to enter.
 */
export function WholeNumberInput({
  value,
  onValueChange,
  accessibilityLabel,
  accessibilityHint,
  suffix,
  editable = true,
  testID,
  onSubmitEditing,
}: WholeNumberInputProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [text, setText] = useState(() => (value === null ? "" : String(value)));
  const [focused, setFocused] = useState(false);
  // The last value this field reported, so its own changes coming back as `value` leave the text alone.
  const reported = useRef<number | null>(value);

  useEffect(() => {
    if (value === reported.current) return;
    reported.current = value;
    setText(value === null ? "" : String(value));
  }, [value]);

  const handleChange = (next: string) => {
    setText(next);
    const parsed = parseWholeNumberInput(next);
    reported.current = parsed;
    onValueChange(parsed, next);
  };

  const handleBlur = () => {
    setFocused(false);
    const parsed = parseWholeNumberInput(text);
    if (parsed !== null) setText(String(parsed));
  };

  // A gallery preview draws the scale itself, so the phone's setting must not multiply it again.
  const preview = theme.textScale !== 1;

  return (
    <View style={[styles.box, focused ? styles.focused : null, editable ? null : styles.disabled]}>
      <TextInput
        value={text}
        onChangeText={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={handleBlur}
        onSubmitEditing={onSubmitEditing}
        keyboardType="number-pad"
        inputMode="numeric"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: !editable }}
        editable={editable}
        {...(preview ? { allowFontScaling: false } : {})}
        style={styles.input}
        testID={testID}
      />
      {suffix ? (
        <Text
          color="secondary"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {suffix}
        </Text>
      ) : null}
    </View>
  );
}
