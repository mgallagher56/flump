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
  /** Opens the app's net worth choices (Settings, Profile, E12 S9). */
  onChangeWhatCounts(): void;
  /**
   * Opens the app's add form as a home estimate (E12 S8). Left out while saved figures show
   * offline (E12 S7): adding writes, so the line keeps its sentence and offers no link.
   */
  onAddEstimate?: () => void;
  /**
   * Show the "Change what counts" link on its own when nothing is left out, so the choice can be
   * found from the figure (web: the accounts list only). Needs `choicesAvailable`.
   */
  alwaysShowLink?: boolean;
  /** False when no net worth choice applies to these accounts: the lone link is not shown. */
  choicesAvailable?: boolean;
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
  alwaysShowLink = false,
  choicesAvailable = true,
  testID = "net-worth-basis-line",
}: NetWorthBasisLineProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const missingHome = leftOut.includes("homeValueMissing");
  const sentence = missingHome ? HOME.homeValueMissing : leftOutSentence(leftOut);
  if (!sentence && !(alwaysShowLink && choicesAvailable)) return null;
  return (
    <View style={styles.base} testID={testID}>
      {sentence ? (
        <Text textStyle="body.sm" color="secondary">
          {sentence}
        </Text>
      ) : null}
      {missingHome && !onAddEstimate ? null : (
        <Button
          label={missingHome ? HOME.addEstimate : HOME.changeWhatCounts}
          variant="link"
          size="sm"
          accessibilityRole="link"
          testID={`${testID}-action`}
          onPress={missingHome ? (onAddEstimate ?? (() => {})) : onChangeWhatCounts}
        />
      )}
    </View>
  );
}
