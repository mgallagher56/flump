import { useMemo } from "react";
import { View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { Icon } from "../Icon";
import { formatWholePounds, Money } from "../Money/Money";
import { Pressable } from "../Pressable";
import { Text } from "../Text";
import { createStyles } from "./AccountRow.styles";

export interface AccountRowProps {
  name: string;
  /** "Mortgage · Joint, 50%", or null when the name already says the type. */
  typeLine: string | null;
  /** The person's share, an amount owed as positive (the engine's). Undefined: not known. */
  balance: number | undefined;
  /** Opens the account's page. */
  onPress(): void;
  testID?: string;
}

/**
 * One account in the list, as a row of web's accounts list: the name, the type line under it and
 * one balance, opening the account's page. One element for a screen reader ("Residential mortgage,
 * Mortgage, £186,000"), at least 48 high. A debt is the amount owed, in the ordinary text colour.
 */
export function AccountRow({ name, typeLine, balance, onPress, testID }: AccountRowProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const figure = balance === undefined ? null : balance;
  // The type line's "·" is sight only; a screen reader hears commas.
  const spoken = [
    name,
    typeLine?.replaceAll(" · ", ", "),
    formatWholePounds(figure).replace(/^-/, "minus "),
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={spoken}
      testID={testID}
      style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
      onPress={onPress}
    >
      <View style={styles.text}>
        <Text>{name}</Text>
        {typeLine ? (
          <Text textStyle="body.sm" color="secondary">
            {typeLine}
          </Text>
        ) : null}
      </View>
      <Money value={figure} size="md" testID={testID ? `${testID}-balance` : undefined} />
      <Icon name="chevron-right" size="sm" />
    </Pressable>
  );
}
