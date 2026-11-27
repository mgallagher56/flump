import { type BreathingRoomFixedReason, describeBreathingRoom } from "@flump/finance-engine/budget";
import { useMemo, useState } from "react";
import { View } from "react-native";
import {
  BASIS,
  BREATHING_ROOM,
  basisSubtitle,
  breathingRoomSource,
  spendingHint,
} from "../../copy/budget";
import { useTheme } from "../../theme/ThemeProvider";
import { Button } from "../Button";
import { Card } from "../Card";
import { CollapsibleDrawer } from "../CollapsibleDrawer";
import { formatWholePounds, Money } from "../Money/Money";
import { Switch } from "../Switch";
import { Text } from "../Text";
import { createStyles } from "./BreathingRoom.styles";

/** The saved figure (the engine's `monthsOfCover`), or null when it is not known. */
interface BreathingRoomFigure {
  months: number;
  liquidCash: number;
  monthlyEssentials: number;
}

/** One spending row in "What Breathing room counts", from the engine's basis. */
interface BasisSpending {
  id: string;
  name: string;
  category: string;
  monthly: number;
  /** Why it always counts, or null when its switch can change. */
  fixedReason: BreathingRoomFixedReason | null;
  /** Counted: essential, or always counted. The switch shows this. */
  counted: boolean;
  /** False for a row the phone cannot save (no saved row behind it): its switch is disabled. */
  editable: boolean;
}

export interface BreathingRoomProps {
  figure: BreathingRoomFigure | null;
  /** The accounts it draws on, each at its latest balance (never below £0). */
  drawOn: readonly { id: string; name: string; balance: number }[];
  spending: readonly BasisSpending[];
  /** How many spending rows count (the engine's count). */
  counted: number;
  /** Saves one entry's Essential flag. Rejects or resolves false on failure. */
  onSetEssential(id: string, isEssential: boolean): Promise<unknown>;
  /** Opens where the savings accounts are listed (the app's Accounts tab). */
  onViewSavings(): void;
  /** Defaults to "breathing-room". */
  testID?: string;
}

/**
 * "Breathing room", as web's `BreathingRoom` and `BreathingRoomBasis`: the saved figure in words
 * ("About 4.7 months"), where it comes from, and a drawer saying what it counts. Each spending
 * switch is the entry's own Essential flag; the screen saves it. Facts only: no target, no colour
 * that grades the figure.
 */
export function BreathingRoom({
  figure,
  drawOn,
  spending,
  counted,
  onSetEssential,
  onViewSavings,
  testID = "breathing-room",
}: BreathingRoomProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [pending, setPending] = useState<ReadonlySet<string>>(() => new Set());
  const wording = figure ? describeBreathingRoom(figure.months) : null;

  const toggle = async (id: string, next: boolean) => {
    if (pending.has(id)) return;
    setPending((was) => new Set(was).add(id));
    try {
      await onSetEssential(id, next);
    } catch {
      // The screen says what went wrong; the switch keeps the saved value.
    } finally {
      setPending((was) => {
        const left = new Set(was);
        left.delete(id);
        return left;
      });
    }
  };

  return (
    <View style={styles.base} testID={testID}>
      <Text accessibilityRole="header" textStyle="heading.sm">
        {BREATHING_ROOM.label}
      </Text>
      <Text textStyle="body.sm" color="secondary">
        {BREATHING_ROOM.description}
      </Text>
      <Text textStyle="body.sm" color="secondary">
        {BREATHING_ROOM.detail}
      </Text>
      <Card>
        {figure && wording ? (
          <>
            <View
              accessible
              accessibilityLabel={`${BREATHING_ROOM.label}, ${wording.leadIn} ${wording.figure}`}
              style={styles.result}
              testID={`${testID}-figure`}
            >
              <Text textStyle="label.md" color="secondary">
                {wording.leadIn}
              </Text>
              <Text textStyle="heading.md" tabular>
                {wording.figure}
              </Text>
            </View>
            <Text textStyle="body.sm" color="secondary" tabular testID={`${testID}-source`}>
              {breathingRoomSource(figure.liquidCash, figure.monthlyEssentials)}
            </Text>
            <Button
              label={BREATHING_ROOM.viewSavings}
              variant="link"
              size="sm"
              accessibilityRole="link"
              testID={`${testID}-savings`}
              onPress={onViewSavings}
            />
          </>
        ) : (
          <Text color="secondary" testID={`${testID}-empty`}>
            {BREATHING_ROOM.emptyPrompt}
          </Text>
        )}
      </Card>
      <View style={styles.basis} testID={`${testID}-basis`}>
        <Text textStyle="label.md">{BASIS.title}</Text>
        <Text textStyle="body.sm" color="secondary" tabular>
          {basisSubtitle(drawOn.length, counted, spending.length)}
        </Text>
        <CollapsibleDrawer label={BASIS.closed} openLabel={BASIS.open} testID={`${testID}-drawer`}>
          <Text textStyle="body.sm" color="secondary">
            {BASIS.intro}
          </Text>
          <Card>
            <Text accessibilityRole="header" textStyle="label.md">
              {BASIS.accountsHeading}
            </Text>
            {drawOn.length > 0 ? (
              drawOn.map((account) => (
                <View
                  key={account.id}
                  accessible
                  accessibilityLabel={`${account.name}, ${formatWholePounds(account.balance)}`}
                  style={styles.line}
                >
                  <Text style={styles.lineName}>{account.name}</Text>
                  <Money value={account.balance} size="sm" />
                </View>
              ))
            ) : (
              <Text color="secondary">{BASIS.noAccounts}</Text>
            )}
            <Text textStyle="body.sm" color="secondary">
              {BASIS.notCounted}
            </Text>
            <Button
              label={BASIS.viewOrUpdate}
              variant="link"
              size="sm"
              accessibilityRole="link"
              testID={`${testID}-basis-savings`}
              onPress={onViewSavings}
            />
          </Card>
          <Card>
            <Text accessibilityRole="header" textStyle="label.md">
              {BASIS.spendingHeading}
            </Text>
            {spending.length > 0 ? (
              spending.map((row) => (
                <Switch
                  key={row.id}
                  label={row.name}
                  hint={spendingHint(row.category, row.monthly, row.fixedReason)}
                  value={row.counted}
                  busy={pending.has(row.id)}
                  disabled={row.fixedReason !== null || !row.editable}
                  testID={`${testID}-essential-${row.id}`}
                  onValueChange={(next) => void toggle(row.id, next)}
                />
              ))
            ) : (
              <Text color="secondary">{BASIS.noSpending}</Text>
            )}
          </Card>
        </CollapsibleDrawer>
      </View>
    </View>
  );
}
