import { useMemo } from "react";
import { Linking, View } from "react-native";
import { DEBT_HELP } from "../../copy/budget";
import { useTheme } from "../../theme/ThemeProvider";
import { Button } from "../Button";
import { Text } from "../Text";
import { createStyles } from "./DebtHelpLink.styles";

export interface DebtHelpLinkProps {
  /** Defaults to "debt-help-link". */
  testID?: string;
}

/**
 * One neutral signpost to free debt advice, as web's `DebtHelpLink` (owner-approved R3 exception,
 * 13 November 2026). It takes no figures on purpose: everyone sees the same line in the same
 * place, and nothing about balances can trigger or change it (R4). The link opens MoneyHelper in
 * the browser.
 */
export function DebtHelpLink({ testID = "debt-help-link" }: DebtHelpLinkProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View accessibilityLabel={DEBT_HELP.label} style={styles.base} testID={testID}>
      <Text textStyle="body.sm" color="secondary">
        {DEBT_HELP.lead}
      </Text>
      <Button
        label={DEBT_HELP.link}
        variant="link"
        size="sm"
        accessibilityRole="link"
        testID={`${testID}-moneyhelper`}
        onPress={() => void Linking.openURL(DEBT_HELP.url)}
      />
    </View>
  );
}
