import type { CheckInMonth, CheckInSummary } from "@flump/finance-engine/check-in";
import { useEffect, useMemo } from "react";
import { AccessibilityInfo, View } from "react-native";
import { Button } from "../../components/Button";
import { HeroFigure } from "../../components/HeroFigure";
import { Screen } from "../../components/Screen";
import { StatusBadge } from "../../components/StatusBadge";
import { Text } from "../../components/Text";
import {
  CHECK_IN,
  changeText,
  checkedInText,
  monthInBrief,
  netWorthChangeText,
} from "../../copy/checkIn";
import { useTheme } from "../../theme/ThemeProvider";
import { createStyles } from "./CheckInDone.styles";

export interface CheckInDoneProps {
  month: CheckInMonth;
  /** The engine's `buildCheckInSummary`, as web's summary reads it. */
  summary: CheckInSummary;
  onDone(): void;
  /** Back to the cards to correct one. */
  onChangeBalance(): void;
}

/**
 * The end of the check-in, as web's `CheckInSummary`: "November is checked in." (the action, never
 * the amount), the month in brief, what the person changed (old figure to new), and net worth
 * against last month in the same sentence whichever way it moved. Whole pounds; no verdict.
 */
export function CheckInDone({ month, summary, onDone, onChangeBalance }: CheckInDoneProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const heading = checkedInText(month);
  const brief = monthInBrief(month, summary);

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(heading);
  }, [heading]);

  return (
    <Screen edges={["bottom", "left", "right"]} testID="check-in-summary">
      <Text accessibilityRole="header" textStyle="heading.md">
        {heading}
      </Text>

      {brief ? (
        <View style={styles.block} testID="check-in-brief">
          <Text accessibilityRole="header" textStyle="heading.sm">
            {brief.heading}
          </Text>
          <Text tabular>{brief.facts.join(" ")}</Text>
        </View>
      ) : null}

      {summary.changed.length > 0 ? (
        <View style={styles.block}>
          <Text accessibilityRole="header" textStyle="heading.sm">
            {CHECK_IN.whatChanged}
          </Text>
          {summary.changed.map((c) => (
            <View key={c.accountId} style={styles.row} accessible>
              <Text>{c.name}</Text>
              <View style={styles.figure}>
                {c.calculated ? <StatusBadge label={CHECK_IN.calculated} /> : null}
                <Text tabular>{changeText(c.previous, c.value)}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {summary.netWorth !== null ? (
        <HeroFigure
          label={CHECK_IN.netWorth}
          value={summary.netWorth}
          caption={netWorthChangeText(summary.change, summary.previousMonth)}
          testID="check-in-net-worth"
        />
      ) : null}

      <View style={styles.actions}>
        <Button label={CHECK_IN.done} testID="check-in-done" onPress={onDone} />
        <Button
          label={CHECK_IN.changeBalance}
          variant="secondary"
          testID="check-in-change-balance"
          onPress={onChangeBalance}
        />
      </View>
    </Screen>
  );
}
