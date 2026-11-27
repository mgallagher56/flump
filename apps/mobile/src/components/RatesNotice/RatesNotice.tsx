import { useMemo } from "react";
import { View } from "react-native";
import { type RatesContext, ratesNoticeSentence } from "../../copy/home";
import { useTheme } from "../../theme/ThemeProvider";
import { Text } from "../Text";
import { createStyles, KIND_COLOURS } from "./RatesNotice.styles";

export interface RatesNoticeProps {
  /** The engine's rates context (`HomeStrip.ratesNotice`), or null when no notice is due. */
  rates: RatesContext | null;
  /** Defaults to "rates-notice". */
  testID?: string;
}

/**
 * Which tax year's rates a worked-out figure uses when they are not the calendar year's confirmed
 * ones, in web's `TaxRatesStatusBanner` words: provisional rates in the info colours, another
 * year's rates in the warning colours. Nothing when the rates match the calendar. A fact, not an
 * alarm: the figures stand.
 */
export function RatesNotice({ rates, testID = "rates-notice" }: RatesNoticeProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const sentence = rates ? ratesNoticeSentence(rates) : "";
  if (!rates || !sentence) return null;
  const kind = rates.kind === "provisional" ? "provisional" : "fallback";
  return (
    <View accessible style={[styles.base, styles[kind]]} testID={testID}>
      <Text textStyle="body.sm" color={KIND_COLOURS[kind].text} tabular>
        {sentence}
      </Text>
    </View>
  );
}
