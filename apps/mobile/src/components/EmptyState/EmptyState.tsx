import { useMemo } from "react";
import { View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { Button } from "../Button";
import { Text } from "../Text";
import { createStyles } from "./EmptyState.styles";

/** One way on from an empty state. */
interface EmptyStateAction {
  label: string;
  onPress(): void;
  /** `primary` for the one main action (the default); `link` for one that opens the website. */
  variant?: "primary" | "link";
  testID?: string;
}

export interface EmptyStateProps {
  /** What is not here yet ("No accounts yet"), read as a heading. */
  title: string;
  /** One sentence saying what fills it. */
  description: string;
  actions?: readonly EmptyStateAction[];
  testID?: string;
}

/**
 * Nothing saved yet, said plainly, as web's `EmptyState`: a heading, one sentence and the way on.
 * Only for an answer that came back empty; a failed read is `ErrorState`, never this.
 */
export function EmptyState({ title, description, actions = [], testID }: EmptyStateProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.base} testID={testID}>
      <Text accessibilityRole="header" textStyle="heading.md">
        {title}
      </Text>
      <Text color="secondary">{description}</Text>
      {actions.map((action) => (
        <Button
          key={action.label}
          label={action.label}
          variant={action.variant ?? "primary"}
          accessibilityRole={action.variant === "link" ? "link" : "button"}
          testID={action.testID}
          onPress={action.onPress}
        />
      ))}
    </View>
  );
}
