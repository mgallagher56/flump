import { useMemo, useState } from "react";
import { AccessibilityInfo, View } from "react-native";
import { QUICK_BALANCE } from "../../copy/accountForms";
import { SAVE_NEEDS_CONNECTION } from "../../copy/offline";
import { useTheme } from "../../theme/ThemeProvider";
import { Button } from "../Button";
import { CurrencyInput } from "../CurrencyInput";
import { FormField } from "../FormField";
import { InlineAlert } from "../InlineAlert";
import { createStyles } from "./QuickBalanceUpdate.styles";

export interface QuickBalanceUpdateProps {
  /** The account's name, read after the field's label ("New balance, Holiday fund"). */
  accountName: string;
  /** A debt: the field asks for the amount owed, a positive figure. */
  owed: boolean;
  /** The saved figure as the page shows it: the balance, or the amount owed as a positive figure. */
  current: number | null;
  /** The joint account's note the edit form shows under the same field, when there is one. */
  hint?: string | null;
  /**
   * Saves the figure typed, as shown (the caller stores a debt as minus the amount owed). Resolves
   * with what went wrong in web's words, or null once it saved.
   */
  onSave(value: number): Promise<string | null>;
  /**
   * The form's check of what was typed (the account forms' own, so both say the same): what is
   * wrong under the field, or null. Runs on Save before anything is sent.
   */
  check?(value: number | null, text: string): string | null;
  /**
   * The connection is down (E12 S7 follow-up): closed, there is no way in; left open when it
   * dropped, the field keeps what was typed, Save is off and one line says saving needs a connection.
   */
  offline?: boolean;
  testID?: string;
}

/**
 * Updates one account's balance where it is shown, as web's (E38 S2), so a new figure needs no
 * trip through the edit form. A quiet button opens one field with the saved figure in it; Save
 * saves and closes, Cancel closes without saving. A failed save keeps the field open with what
 * was typed and says what went wrong, so it can be tried again.
 */
export function QuickBalanceUpdate({
  accountName,
  owed,
  current,
  hint,
  onSave,
  check = () => null,
  offline = false,
  testID = "quick-balance",
}: QuickBalanceUpdateProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<number | null>(current);
  // What was typed, so a minus or text that is not an amount can be told apart from blank.
  const [text, setText] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!open) {
    if (offline) return null;
    return (
      <Button
        label={owed ? QUICK_BALANCE.openOwed : QUICK_BALANCE.openBalance}
        variant="outline"
        size="sm"
        testID={`${testID}-open`}
        onPress={() => {
          setValue(current);
          setText(current === null ? "" : String(current));
          setFieldError(null);
          setError(null);
          setOpen(true);
        }}
      />
    );
  }

  const label = owed ? QUICK_BALANCE.fieldOwed : QUICK_BALANCE.fieldBalance;
  const save = async () => {
    if (pending || offline) return;
    const problem = check(value, text);
    if (problem) {
      setFieldError(problem);
      // Read out on both platforms: the field's error line is not a live region on iOS.
      AccessibilityInfo.announceForAccessibility(problem);
      return;
    }
    if (value === null) return;
    setPending(true);
    setError(null);
    const failed = await onSave(value);
    setPending(false);
    if (failed) {
      setError(failed);
      // Read out on both platforms: the alert's live region reaches Android only.
      AccessibilityInfo.announceForAccessibility(failed);
    } else setOpen(false);
  };

  return (
    <View style={styles.group} testID={`${testID}-form`}>
      <FormField label={label} hint={hint ?? undefined} error={fieldError}>
        <CurrencyInput
          value={value}
          // A debt's amount owed is never below zero (web refuses one); a balance can be.
          allowNegative={!owed}
          onValueChange={(next, typed) => {
            setValue(next);
            setText(typed);
            // A new figure replaces what was said about the last one.
            setFieldError(null);
            setError(null);
          }}
          accessibilityLabel={`${label}, ${accountName}`}
          editable={!pending}
          testID={`${testID}-value`}
          onSubmitEditing={() => void save()}
        />
      </FormField>
      {offline ? (
        <InlineAlert tone="info" message={SAVE_NEEDS_CONNECTION} testID={`${testID}-offline`} />
      ) : null}
      {error ? <InlineAlert message={error} testID={`${testID}-error`} /> : null}
      <View style={styles.actions}>
        <Button
          label={pending ? QUICK_BALANCE.saving : QUICK_BALANCE.save}
          size="sm"
          pending={pending}
          disabled={offline || text.trim() === ""}
          testID={`${testID}-save`}
          onPress={() => void save()}
        />
        <Button
          label={QUICK_BALANCE.cancel}
          variant="ghost"
          size="sm"
          disabled={pending}
          testID={`${testID}-cancel`}
          onPress={() => setOpen(false)}
        />
      </View>
    </View>
  );
}
