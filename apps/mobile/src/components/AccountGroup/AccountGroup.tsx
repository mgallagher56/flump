import { type ReactNode, useMemo } from "react";
import { View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { Card } from "../Card";
import { formatWholePounds, Money } from "../Money/Money";
import { Text } from "../Text";
import { createStyles } from "./AccountGroup.styles";

/** A group's total: its words and the engine's figure. */
interface AccountGroupTotal {
  label: string;
  value: number;
}

export interface AccountGroupProps {
  /** "What you own", read as a heading. */
  title: string;
  /** One line saying what the group is. */
  description: string;
  /** The rows (`AccountRow`). */
  children: ReactNode;
  /** Shown only for a group of two or more rows: a total that repeats its one row is noise. */
  total?: AccountGroupTotal | null;
  /** One quiet line under the group (the student loan facts). */
  footnote?: string | null;
  testID?: string;
}

/**
 * One group of the accounts list, as web's `Group`: a heading, its line, the rows in a card and the
 * total under them, then a footnote. The total is one element ("Total you own, £427,000").
 */
export function AccountGroup({
  title,
  description,
  children,
  total,
  footnote,
  testID,
}: AccountGroupProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.base} testID={testID}>
      <View style={styles.header}>
        <Text accessibilityRole="header" textStyle="heading.sm">
          {title}
        </Text>
        <Text textStyle="body.sm" color="secondary">
          {description}
        </Text>
      </View>
      <Card padding="none">
        {children}
        {total ? (
          <View
            accessible
            accessibilityLabel={`${total.label}, ${formatWholePounds(total.value).replace(/^-/, "minus ")}`}
            style={styles.total}
            testID={testID ? `${testID}-total` : undefined}
          >
            <Text textStyle="label.md" style={styles.totalLabel}>
              {total.label}
            </Text>
            <Money value={total.value} size="md" />
          </View>
        ) : null}
      </Card>
      {footnote ? (
        <Text textStyle="body.sm" color="secondary">
          {footnote}
        </Text>
      ) : null}
    </View>
  );
}
