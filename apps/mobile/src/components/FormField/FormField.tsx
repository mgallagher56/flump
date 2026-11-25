import { type ReactNode, useMemo } from "react";
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

/** A label, a control, an optional hint and an error read out when it appears. */
export function FormField({ label, hint, error, children, testID }: FormFieldProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.base} testID={testID}>
      <Text textStyle="label.md" style={styles.label}>
        {label}
      </Text>
      {children}
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
