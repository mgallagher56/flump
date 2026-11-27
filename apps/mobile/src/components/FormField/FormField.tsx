import { createContext, type ReactNode, useContext, useMemo } from "react";
import { View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { Text } from "../Text";
import { createStyles } from "./FormField.styles";

export interface FormFieldProps {
  /** Shown above the control. Give the control the same words as its accessibilityLabel. */
  label: string;
  /** Help under the control, in secondary text. */
  hint?: string;
  /** What is wrong and how to fix it. The only red in a form. */
  error?: string | null;
  /** The control. */
  children: ReactNode;
  testID?: string;
}

/** The field's error, for the control inside it to say with its own name (S8 device check). */
const FieldError = createContext<string | null>(null);

/**
 * A control's accessible name with its field's error after it ("Name. Enter a name for this
 * account."). The name is the one channel every screen reader reads on a text field: Android
 * exposes no hint on one (device re-check, 27 Nov 2026), so an error in the hint went unheard.
 */
export function useFieldName(name: string): string {
  const error = useContext(FieldError);
  if (!error) return name;
  return `${name}. ${error.endsWith(".") ? error : `${error}.`}`;
}

/** A label, a control, an optional hint and an error read out when it appears. */
export function FormField({ label, hint, error, children, testID }: FormFieldProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.base} testID={testID}>
      <Text textStyle="label.md">{label}</Text>
      <FieldError.Provider value={error ?? null}>{children}</FieldError.Provider>
      {hint ? (
        <Text textStyle="body.sm" color="secondary">
          {hint}
        </Text>
      ) : null}
      {error ? (
        <Text textStyle="body.sm" color="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
