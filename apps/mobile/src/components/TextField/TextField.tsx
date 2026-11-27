import { useMemo, useState } from "react";
// Raw React Native inputs are allowed inside src/components (biome.json, apps/mobile override).
import { TextInput, type TextInputProps, View } from "react-native";
import { useScrollFieldIntoView } from "../../device/keyboardInset";
import { useTheme } from "../../theme/ThemeProvider";
import { useFieldName } from "../FormField/FormField";
import { createStyles } from "./TextField.styles";

export interface TextFieldProps {
  value: string;
  onChangeText(text: string): void;
  /** The field's name: give it the same words as the FormField label above it. */
  accessibilityLabel: string;
  /** Called when focus leaves (a name saves then, as web's). */
  onBlur?: () => void;
  onSubmitEditing?: () => void;
  autoComplete?: TextInputProps["autoComplete"];
  /** Defaults to true. */
  editable?: boolean;
  /** The input's test id; its box is `<testID>-box`. */
  testID?: string;
}

/**
 * A line of text, such as a name, in the same box as `CurrencyInput`. No placeholder: the label
 * says what to enter. Its words follow the phone's text size.
 */
export function TextField({
  value,
  onChangeText,
  accessibilityLabel,
  onBlur,
  onSubmitEditing,
  autoComplete,
  editable = true,
  testID,
}: TextFieldProps) {
  const theme = useTheme();
  const spokenName = useFieldName(accessibilityLabel);
  // In a form, the field scrolls above the keyboard when it gains focus.
  const showField = useScrollFieldIntoView();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [focused, setFocused] = useState(false);
  // A gallery preview draws the scale itself, so the phone's setting must not multiply it again.
  const preview = theme.textScale !== 1;
  return (
    <View
      style={[styles.box, focused ? styles.focused : null, editable ? null : styles.disabled]}
      testID={testID ? `${testID}-box` : undefined}
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => {
          setFocused(true);
          showField();
        }}
        onBlur={() => {
          setFocused(false);
          onBlur?.();
        }}
        onSubmitEditing={onSubmitEditing}
        autoComplete={autoComplete}
        autoCorrect={false}
        accessibilityLabel={spokenName}
        accessibilityState={{ disabled: !editable }}
        editable={editable}
        {...(preview ? { allowFontScaling: false } : {})}
        style={styles.input}
        testID={testID}
      />
    </View>
  );
}
