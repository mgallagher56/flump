import { useEffect, useMemo, useRef, useState } from "react";
// Raw React Native inputs are allowed inside src/components (biome.json, apps/mobile override).
import { TextInput, View } from "react-native";
import { useScrollFieldIntoView } from "../../device/keyboardInset";
import { useTheme } from "../../theme/ThemeProvider";
import { useFieldName } from "../FormField/FormField";
import { Text } from "../Text";
import { createStyles } from "./PercentInput.styles";

export interface PercentInputProps {
  /** A percentage (4.5 for 4.5%), or `null` for blank. Blank is never 0. */
  value: number | null;
  /** Called on every change with the parsed percentage, or `null` while blank or invalid. */
  onValueChange(value: number | null, text: string): void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  /** Decimal places allowed. Defaults to 2; 0 takes whole numbers only (a share). */
  decimals?: number;
  /** Defaults to true. */
  editable?: boolean;
  testID?: string;
  onSubmitEditing?: () => void;
}

/**
 * Reads a typed percentage. Tolerant of spaces and a trailing "%"; at most `decimals` decimal
 * places (none when 0). Blank, negative, non-numeric or too many decimals give `null`. It does not
 * clamp: the form checks the bounds and says what is wrong.
 */
export function parsePercentInput(text: string, decimals = 2): number | null {
  const plain = text.replace(/\s/g, "").replace(/%$/, "");
  const places = Math.max(0, Math.floor(decimals));
  const pattern =
    places === 0 ? /^\d+$/ : new RegExp(`^(\\d+(\\.\\d{0,${places}})?|\\.\\d{1,${places}})$`);
  if (!pattern.test(plain)) return null;
  return Number(plain);
}

/** The percentage as the field shows it after editing: "4.5", "50". The suffix shows the "%". */
const display = (value: number): string => String(value);

/**
 * A percentage, typed on the decimal keypad (the number pad for whole numbers), with a "%" after
 * it that screen readers skip: the label says it is a percentage. It keeps the words as typed while
 * editing and tidies a valid figure when focus leaves. No placeholder: the label says what to enter.
 */
export function PercentInput({
  value,
  onValueChange,
  accessibilityLabel,
  accessibilityHint,
  decimals = 2,
  editable = true,
  testID,
  onSubmitEditing,
}: PercentInputProps) {
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
    const parsed = parsePercentInput(next, decimals);
    reported.current = parsed;
    onValueChange(parsed, next);
  };

  const handleBlur = () => {
    setFocused(false);
    const parsed = parsePercentInput(text, decimals);
    if (parsed !== null) setText(display(parsed));
  };

  // A gallery preview draws the scale itself, so the phone's setting must not multiply it again.
  const preview = theme.textScale !== 1;
  const whole = decimals <= 0;

  return (
    <View style={[styles.box, focused ? styles.focused : null, editable ? null : styles.disabled]}>
      <TextInput
        value={text}
        onChangeText={handleChange}
        onFocus={() => {
          setFocused(true);
          showField();
        }}
        onBlur={handleBlur}
        onSubmitEditing={onSubmitEditing}
        keyboardType={whole ? "number-pad" : "decimal-pad"}
        inputMode={whole ? "numeric" : "decimal"}
        accessibilityLabel={spokenName}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: !editable }}
        editable={editable}
        {...(preview ? { allowFontScaling: false } : {})}
        style={styles.input}
        testID={testID}
      />
      <Text
        color="secondary"
        tabular
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        %
      </Text>
    </View>
  );
}
