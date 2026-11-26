import type { NetWorthLeftOut } from "@flump/finance-engine/net-worth";
import { useMemo } from "react";
import { View } from "react-native";
import { HOME, leftOutSentence } from "../../copy/home";
import { useTheme } from "../../theme/ThemeProvider";
import { Button } from "../Button";
import { Text } from "../Text";
import { createStyles } from "./NetWorthBasisLine.styles";

export interface NetWorthBasisLineProps {
  /** What the net worth figure leaves out, from the engine (`NetWorthTotals.leftOut`). */
  leftOut: readonly NetWorthLeftOut[];
  /** Opens where the net worth choices are changed (the website's settings until S9). */
  onChangeWhatCounts(): void;
  /** Opens where a home estimate is added (the website until S8). */
  onAddEstimate(): void;
  /**
   * The link's words when it does not open the page itself (no web app address in this build: the
   * website's home page). Defaults to the page's own words.
   */
  websiteLabel?: string;
  /** Defaults to "net-worth-basis-line". */
  testID?: string;
}

/**
 * The one quiet line under the net worth figure, as web's `NetWorthBasisLine`: a missing home value
 * asks for an estimate instead of the leave-out line, so there is one notice at most. No figures,
 * no colour, and nothing that suggests which choice is better. Nothing when nothing is left out.
 */
export function NetWorthBasisLine({
  leftOut,
  onChangeWhatCounts,
  onAddEstimate,
  websiteLabel,
  testID = "net-worth-basis-line",
}: NetWorthBasisLineProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const missingHome = leftOut.includes("homeValueMissing");
  const sentence = missingHome ? HOME.homeValueMissing : leftOutSentence(leftOut);
  if (!sentence) return null;
  return (
    <View style={styles.base} testID={testID}>
      <Text textStyle="body.sm" color="secondary">
        {sentence}
      </Text>
      <Button
        label={websiteLabel ?? (missingHome ? HOME.addEstimate : HOME.changeWhatCounts)}
        variant="link"
        size="sm"
        accessibilityRole="link"
        testID={`${testID}-action`}
        onPress={missingHome ? onAddEstimate : onChangeWhatCounts}
      />
    </View>
  );
}
