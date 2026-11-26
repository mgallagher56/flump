import { useMemo } from "react";
import { View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { Button } from "../Button";
import { Text } from "../Text";
import { createStyles } from "./ErrorState.styles";

export interface ErrorStateProps {
  /** What could not happen, in plain words ("We could not load your accounts"). */
  heading: string;
  /** What it means and what to do next. Never WorkOS's or the server's own text. */
  body: string;
  onRetry(): void;
  /** Defaults to "Try again". */
  retryLabel?: string;
  testID?: string;
  retryTestID?: string;
}

/**
 * A read that failed, shown as a failure with a way to try again: never as an empty list or a 0
 * (plan section 2, "a failure never renders as empty or zero"). Ordinary text, not red: nothing
 * the person did is wrong.
 */
export function ErrorState({
  heading,
  body,
  onRetry,
  retryLabel = "Try again",
  testID,
  retryTestID,
}: ErrorStateProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.base} testID={testID}>
      <Text accessibilityRole="header" textStyle="heading.md">
        {heading}
      </Text>
      <Text color="secondary">{body}</Text>
      <Button label={retryLabel} testID={retryTestID} onPress={onRetry} />
    </View>
  );
}
